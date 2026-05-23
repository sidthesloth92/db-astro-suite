import { solveWithAstrometry } from "./astrometry.service.js";
import { querySimbad } from "./simbad.service.js";
import { findObjectsInRadius } from "./local-catalog.service.js";
import { mergeObjects } from "../utils/catalog-merge.util.js";
import { LocalCatalogDao } from "../dao/local-catalog.dao.js";
import { SolveResult, SolveMetadata } from "../models/solve.model.js";
import { CatalogError } from "../models/errors.model.js";

/**
 * Orchestrates the full plate-solve pipeline: astrometry → catalog queries → merge.
 *
 * @param {string} filePath - Absolute path to the saved image file
 * @param {Object} hints - Solving hints extracted from the request
 * @param {LocalCatalogDao | null} localCatalogDao - DAO for the local catalog
 * @param {Object} log - Fastify-compatible logger (request.log)
 * @returns {Promise<SolveResult & { solveStats: Object, catalogStats: Object }>}
 */
export async function processSolveRequest(
  filePath,
  hints,
  localCatalogDao,
  log,
) {
  const warnings = [];

  // Step 1: Plate Solve using local Astrometry.net
  const solveResult = await solveWithAstrometry(filePath, hints, log);

  // Step 2: Hybrid Search (Local + SIMBAD)
  // We search within a 2-degree radius (typical wide field crop)
  const radius = 2.0;
  let simbadAvailable = true;

  // Fire both queries in parallel
  const [localObjects, simbadObjects] = await Promise.all([
    // Local DB Query (Extremely fast, <10ms)
    findObjectsInRadius(localCatalogDao, {
      ra: solveResult.ra,
      dec: solveResult.dec,
      radiusDeg: radius,
      maxMagnitude: hints.min_magnitude,
      types: hints.types,
      log,
    }).catch((err) => {
      if (!(err instanceof CatalogError)) throw err;
      log.error({ err }, "Local catalog query failed");
      return [];
    }),

    // SIMBAD Query (Slower, network dependent)
    querySimbad(
      solveResult.ra,
      solveResult.dec,
      radius,
      hints.min_magnitude,
    ).catch((err) => {
      if (!(err instanceof CatalogError)) throw err;
      log.warn(
        { err },
        "SIMBAD query failed; falling back to local catalog only",
      );
      warnings.push(
        "Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete.",
      );
      simbadAvailable = false;
      return [];
    }),
  ]);

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

  return result;
}
