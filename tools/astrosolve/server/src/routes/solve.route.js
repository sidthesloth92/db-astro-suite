import PQueue from "p-queue";
import fs from "fs/promises";
import config from "../config.js";
import { SolveError } from "../models/errors.model.js";
import { parseMultipartRequest } from "../services/upload.service.js";
import { processSolveRequest } from "../services/solve.service.js";
import { solveAuthHook } from "../hooks/solve-auth.hook.js";
import { AccessKeyDao } from "../dao/access-key.dao.js";
import { LocalCatalogDao } from "../dao/local-catalog.dao.js";

// Concurrency queue to protect backend execution.
const solveQueue = new PQueue({ concurrency: config.queueConcurrency });

/** @typedef {import('fastify').FastifyInstance} FastifyInstance */

/**
 * Fastify route plugin — registers the POST /api/v1/solve endpoint.
 * Receives DAO instances via plugin opts (dependency injection).
 * Handles request parsing, queue management, and response mapping only.
 * All business logic is delegated to the solve service.
 *
 * @param {FastifyInstance} fastify
 * @param {{ accessKeyDao: AccessKeyDao, localCatalogDao: LocalCatalogDao }} opts
 */
export default async function (fastify, opts) {
  const { accessKeyDao, localCatalogDao } = opts;

  await fs.mkdir(config.uploadsDir, { recursive: true });

  const routeOptions = {};

  if (config.solveApiKeyRequired) {
    routeOptions.preHandler = solveAuthHook(config, accessKeyDao);
  }

  fastify.post("/api/v1/solve", routeOptions, async (request, reply) => {
    try {
      fastify.log.info("Parsing multipart request...");
      const { filePath, hints } = await parseMultipartRequest(
        request,
        config.uploadsDir,
      );
      fastify.log.info(`Multipart parsed, starting queue for ${filePath}`);

      if (solveQueue.size + solveQueue.pending >= config.queueMaxSize) {
        await fs.unlink(filePath).catch(() => {});
        return reply.code(503).send({
          code: "SERVER_BUSY",
          message: "Solver queue is full. Please retry in a minute.",
          details: {},
        });
      }

      const result = await solveQueue.add(async () => {
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
      if (e instanceof SolveError) {
        return reply.code(e.statusCode).send({
          code: "VALIDATION_ERROR",
          message: e.message,
          details: {},
        });
      }

      fastify.log.error(e);
      return reply.code(500).send({
        code: "SOLVE_FAILED",
        message: "Internal processing error during astrometry solving.",
        details: {},
      });
    }
  });
}
