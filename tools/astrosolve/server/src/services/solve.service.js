import { solveWithAstrometry } from "./astrometry.service.js";
import { querySimbad } from "./simbad.service.js";
import { findObjectsInRadius } from "./local-catalog.service.js";
import { mergeObjects } from "../utils/catalog-merge.util.js";
import {
  classifyType,
  OBJECT_BUCKETS,
} from "../utils/object-classifier.util.js";
import { LocalCatalogDao } from "../dao/local-catalog.dao.js";
import { SolveResult, SolveMetadata } from "../models/solve.model.js";
import { CatalogError } from "../models/errors.model.js";

/**
 * Wraps a catalog query so it always produces a `diagnostics` payload —
 * `{status: "ok", elapsed_ms, row_count, ...context}` on success, the
 * `err.details` payload on failure. Errors that aren't `CatalogError`
 * propagate (they indicate a programming bug, not a third-party fault).
 *
 * @template T
 * @param {string} source - Subsystem name ('simbad' | 'local_catalog')
 * @param {() => Promise<T[]>} fn - The catalog call to time
 * @param {Object} contextOnSuccess - Extra fields to merge into the
 *   success diagnostics (request URL, query params, etc.)
 * @returns {Promise<{objects: T[], diagnostics: Object, error?: CatalogError}>}
 *   On a `CatalogError` failure, `error` is populated and `objects` is empty.
 *   On success, `error` is absent.
 */
async function timedCatalog(source, fn, contextOnSuccess) {
  const startedAt = Date.now();
  try {
    const objects = await fn();
    return {
      objects,
      diagnostics: {
        status: "ok",
        elapsed_ms: Date.now() - startedAt,
        row_count: objects.length,
        ...contextOnSuccess,
      },
    };
  } catch (err) {
    if (!(err instanceof CatalogError)) throw err;
    return {
      objects: [],
      diagnostics: err.details ?? {
        status: "error",
        elapsed_ms: Date.now() - startedAt,
        error_message: err.message,
      },
      error: err,
    };
  }
}

/**
 * Computes the per-type and per-source breakdown of a merged object list.
 * Pure helper — no I/O, no mutation of the input array. Returned shape is
 * stable: every bucket in OBJECT_BUCKETS is always present (zero-valued
 * when no objects of that type were returned).
 *
 * @param {Array<{type: string, source: string}>} objects
 * @returns {{stars: number, galaxies: number, nebulae: number, clusters: number, other: number, fromLocal: number, fromSimbad: number}}
 */
function buildObjectBreakdown(objects) {
  const typeTally = Object.fromEntries(OBJECT_BUCKETS.map((b) => [b, 0]));
  let fromLocal = 0;
  let fromSimbad = 0;
  for (const obj of objects) {
    typeTally[classifyType(obj.type)] += 1;
    if (obj.source === "local") fromLocal += 1;
    else if (obj.source === "simbad") fromSimbad += 1;
  }
  return {
    stars: typeTally.stars,
    galaxies: typeTally.galaxies,
    nebulae: typeTally.nebulae,
    clusters: typeTally.clusters,
    other: typeTally.other,
    fromLocal,
    fromSimbad,
  };
}

/**
 * Orchestrates the full plate-solve pipeline: astrometry → catalog queries → merge.
 *
 * @param {string} filePath - Absolute path to the saved image file
 * @param {Object} hints - Solving hints extracted from the request
 * @param {LocalCatalogDao | null} localCatalogDao - DAO for the local catalog
 * @param {Object} log - Fastify-compatible logger (request.log)
 * @returns {Promise<SolveResult & { solveStats: Object, catalogStats: Object, diagnostics: Object, objectBreakdown: Object }>}
 */
export async function processSolveRequest(
  filePath,
  hints,
  localCatalogDao,
  log,
) {
  const warnings = [];

  // Step 1: Plate Solve using local Astrometry.net
  // On failure this throws AstrometryError, which the route handler
  // unpacks. On success it carries its own diagnostics payload.
  const solveResult = await solveWithAstrometry(filePath, hints, log);

  // Step 2: Hybrid Search (Local + SIMBAD)
  // We search within a 2-degree radius (typical wide field crop)
  const radius = 2.0;

  // Fire both queries in parallel — each is wrapped so we always get a
  // diagnostics payload regardless of outcome. Lets us record per-subsystem
  // timings on the happy path too, useful for audience/system insight.
  const [localResult, simbadResult] = await Promise.all([
    timedCatalog(
      "local_catalog",
      () =>
        findObjectsInRadius(localCatalogDao, {
          ra: solveResult.ra,
          dec: solveResult.dec,
          radiusDeg: radius,
          maxMagnitude: hints.min_magnitude,
          types: hints.types,
          log,
        }),
      {
        params: {
          ra: solveResult.ra,
          dec: solveResult.dec,
          radiusDeg: radius,
          maxMagnitude: hints.min_magnitude,
          types: hints.types,
        },
      },
    ),
    timedCatalog(
      "simbad",
      () =>
        querySimbad(
          solveResult.ra,
          solveResult.dec,
          radius,
          hints.min_magnitude,
        ),
      {
        request_url: "http://simbad.u-strasbg.fr/simbad/sim-tap/sync",
      },
    ),
  ]);

  if (localResult.error) {
    log.error({ err: localResult.error }, "Local catalog query failed");
  }
  if (simbadResult.error) {
    log.warn(
      { err: simbadResult.error },
      "SIMBAD query failed; falling back to local catalog only",
    );
    warnings.push(
      "Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete.",
    );
  }

  const localObjects = localResult.objects;
  const simbadObjects = simbadResult.objects;
  const simbadAvailable = !simbadResult.error;

  // Step 3: Deduplication & Merging
  const objects = mergeObjects(localObjects, simbadObjects);

  const result = new SolveResult(
    new SolveMetadata(
      solveResult.ra,
      solveResult.dec,
      solveResult.scale,
      solveResult.wcsData, // astrometry DTO uses wcsData; SolveMetadata.wcs is the public field
      radius,
    ),
    objects,
    warnings,
  );

  // Attach analytics-only fields. These are not part of the public response
  // schema — the route reads them into request.analytics and strips them
  // when building the JSON reply.
  result.solveStats = solveResult.solveStats ?? null;
  result.catalogStats = {
    local_count: localObjects.length,
    simbad_count: simbadObjects.length,
    simbad_available: simbadAvailable,
  };
  // Per-subsystem diagnostics — populated for both success and failure
  // paths so every solve_events row carries a comparable breakdown.
  // The route handler folds this into request.analytics.diagnostics.
  result.diagnostics = {
    astrometry: solveResult.diagnostics ?? null,
    simbad: simbadResult.diagnostics,
    local_catalog: localResult.diagnostics,
  };
  // Per-type and per-source tally of the *post-merge*, *post-dedup* object
  // list. Computed here (not in the route handler) so the route stays
  // routing-only and analytics consumers get a stable shape.
  result.objectBreakdown = buildObjectBreakdown(objects);

  return result;
}
