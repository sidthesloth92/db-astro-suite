import PQueue from "p-queue";
import fs from "fs/promises";
import config from "../config.js";
import { SolveError, AstrometryError } from "../models/errors.model.js";
import { parseMultipartRequest } from "../services/upload.service.js";
import { processSolveRequest } from "../services/solve.service.js";
import { solveAuthHook } from "../hooks/solve-auth.hook.js";
import {
  initSolveAnalytics,
  recordSolveAnalytics,
} from "../hooks/solve-analytics.hook.js";
import { SolveEventOutcome } from "../models/solve-event.model.js";
import { AccessKeyDao } from "../dao/access-key.dao.js";
import { LocalCatalogDao } from "../dao/local-catalog.dao.js";
import { SolveEventDao } from "../dao/solve-event.dao.js";

// Concurrency queue to protect backend execution.
const solveQueue = new PQueue({ concurrency: config.queueConcurrency });

/**
 * Fastify route plugin — registers the POST /api/v1/solve endpoint.
 * Receives DAO instances via plugin opts (dependency injection).
 * Handles request parsing, queue management, and response mapping only.
 * All business logic is delegated to the solve service.
 *
 * @param fastify - Fastify instance
 * @param {{ accessKeyDao: AccessKeyDao, localCatalogDao: LocalCatalogDao, solveEventDao: SolveEventDao }} opts
 */
export default async function (fastify, opts) {
  const { accessKeyDao, localCatalogDao, solveEventDao } = opts;

  await fs.mkdir(config.uploadsDir, { recursive: true });

  // Analytics hooks are scoped to this plugin via Fastify encapsulation,
  // so they only fire for the routes registered below.
  fastify.addHook("onRequest", initSolveAnalytics);
  fastify.addHook("onResponse", recordSolveAnalytics(solveEventDao));

  const routeOptions = {};

  if (config.solveApiKeyRequired) {
    routeOptions.preHandler = solveAuthHook(config, accessKeyDao);
  }

  fastify.post("/api/v1/solve", routeOptions, async (request, reply) => {
    request.log.info("POST /api/v1/solve handler entered");
    // `a` is populated by the initSolveAnalytics onRequest hook. Default to an
    // empty object so the rest of the handler can write to it unconditionally
    // even if the hook didn't run for some reason — we never want analytics
    // bookkeeping to mask the actual error.
    const a = request.analytics ?? {};
    if (!request.analytics) {
      request.log.warn(
        "request.analytics was not initialised; analytics will not be persisted for this request",
      );
    }
    try {
      fastify.log.info("Parsing multipart request...");
      const upload = await parseMultipartRequest(request, config.uploadsDir);
      a.file_size_bytes = upload.fileSizeBytes;
      a.image_width_px = upload.imageWidthPx;
      a.image_height_px = upload.imageHeightPx;
      a.file_extension = upload.fileExtension;
      a.ra_hint_deg = upload.hints.ra_hint ?? null;
      a.dec_hint_deg = upload.hints.dec_hint ?? null;

      const { filePath, hints } = upload;
      fastify.log.info(`Multipart parsed, starting queue for ${filePath}`);

      a.queue_depth_on_enqueue = solveQueue.size + solveQueue.pending;
      if (a.queue_depth_on_enqueue >= config.queueMaxSize) {
        await fs.unlink(filePath).catch(() => {});
        a.outcome = SolveEventOutcome.QUEUE_FULL;
        a.response_code = "SERVER_BUSY";
        a.error_message = "Solver queue is full.";
        return reply.code(503).send({
          code: "SERVER_BUSY",
          message: "Solver queue is full. Please retry in a minute.",
          details: {},
        });
      }

      const enqueuedAt = Date.now();
      const result = await solveQueue.add(async () => {
        a.queue_wait_ms = Date.now() - enqueuedAt;
        try {
          request.log.info("Queue executing processSolveRequest...");
          const res = await processSolveRequest(
            filePath,
            hints,
            localCatalogDao,
            request.log,
          );
          request.log.info("processSolveRequest completed.");
          return res;
        } finally {
          await fs.unlink(filePath).catch((err) => {
            if (err.code !== "ENOENT") {
              request.log.error(
                { err, filePath },
                "Failed to delete uploaded file after processing",
              );
            }
          });
        }
      });

      // Copy solve + catalog metrics into analytics.
      const md = result.metadata;
      a.solve_ra_deg = md.ra;
      a.solve_dec_deg = md.dec;
      // md.scale is degrees/pixel from the WCS CD matrix; convert to arcsec/pixel for legibility.
      a.solve_pixel_scale_arcsec_px = md.scale == null ? null : md.scale * 3600;
      a.solve_field_width_arcmin = result.solveStats?.field_width_arcmin ?? null;
      a.solve_field_height_arcmin =
        result.solveStats?.field_height_arcmin ?? null;
      a.solve_field_rotation_deg =
        result.solveStats?.field_rotation_deg ?? null;
      a.solve_match_count = result.solveStats?.match_count ?? null;
      a.solve_log_odds = result.solveStats?.log_odds ?? null;
      a.solve_index_used = result.solveStats?.index_used ?? null;
      a.solve_duration_ms = result.solveStats?.duration_ms ?? null;
      a.solve_sources_found = result.solveStats?.sources_found ?? null;
      a.local_catalog_count = result.catalogStats?.local_count ?? null;
      a.simbad_count = result.catalogStats?.simbad_count ?? null;
      a.simbad_available =
        result.catalogStats?.simbad_available == null
          ? null
          : result.catalogStats.simbad_available
            ? 1
            : 0;
      a.objects_returned = result.objects.length;
      a.outcome = SolveEventOutcome.SUCCESS;
      a.response_code = "SOLVE_SUCCESS";

      request.log.info("Sending reply...");
      return reply.send({
        code: "SOLVE_SUCCESS",
        message: "Plate solve completed successfully.",
        details: {
          metadata: result.metadata,
          objects: result.objects,
          ...(result.warnings?.length ? { warnings: result.warnings } : {}),
        },
      });
    } catch (e) {
      // Always log the error first so a downstream analytics bookkeeping
      // failure can never swallow the original cause.
      if (e instanceof SolveError) {
        request.log.warn({ err: e }, "Solve request rejected (validation)");
      } else if (e instanceof AstrometryError) {
        fastify.log.error({ err: e }, "Astrometry plate-solve failed");
      } else {
        fastify.log.error({ err: e }, "Unhandled error in /api/v1/solve");
      }

      if (e instanceof SolveError) {
        a.outcome = SolveEventOutcome.VALIDATION_ERROR;
        a.response_code = "VALIDATION_ERROR";
        a.error_message = e.message;
        return reply.code(e.statusCode).send({
          code: "VALIDATION_ERROR",
          message: e.message,
          details: {},
        });
      }

      if (e instanceof AstrometryError) {
        a.outcome = SolveEventOutcome.SOLVE_FAILED;
        a.response_code = "SOLVE_FAILED";
        a.error_message = e.message;
        // Partial solver telemetry — emitted by solve-field before it gave up.
        // Lets the admin dashboard distinguish "image too sparse" from "lots
        // of stars but no catalog match" without having to dig through logs.
        const ps = e.solveStats;
        if (ps) {
          a.solve_duration_ms = ps.duration_ms ?? null;
          a.solve_sources_found = ps.sources_found ?? null;
          a.solve_field_width_arcmin = ps.field_width_arcmin ?? null;
          a.solve_field_height_arcmin = ps.field_height_arcmin ?? null;
          a.solve_field_rotation_deg = ps.field_rotation_deg ?? null;
          a.solve_match_count = ps.match_count ?? null;
          a.solve_log_odds = ps.log_odds ?? null;
          a.solve_index_used = ps.index_used ?? null;
        }
        return reply.code(500).send({
          code: "SOLVE_FAILED",
          message: "Internal processing error during astrometry solving.",
          details: {},
        });
      }

      a.outcome = SolveEventOutcome.INTERNAL_ERROR;
      a.response_code = "SOLVE_FAILED";
      a.error_message = e?.message ?? String(e);
      return reply.code(500).send({
        code: "SOLVE_FAILED",
        message: "Internal processing error during astrometry solving.",
        details: {},
      });
    }
  });
}
