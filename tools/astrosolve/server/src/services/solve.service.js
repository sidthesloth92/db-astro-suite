import { solveWithAstrometry } from "./astrometry.service.js";
import { querySimbad } from "./simbad.service.js";
import { queryLocalCatalog } from "./local-catalog.service.js";
import { mergeObjects, STAR_TYPES } from "./merge.service.js";

/**
 * Orchestrates the full plate-solve pipeline: astrometry → catalog queries → merge.
 *
 * @param {string} filePath - Absolute path to the saved image file
 * @param {Object} hints - Solving hints extracted from the request
 * @param {Object} log - Fastify-compatible logger (request.log)
 * @returns {Promise<{metadata: Object, objects: Array, warnings: string[]}>} Merged solve result
 */
export async function processSolveRequest(filePath, hints, log) {
  const warnings = [];

  // Step 1: Plate Solve using local Astrometry.net
  const solveResult = await solveWithAstrometry(filePath, hints, log);

  // Step 2: Hybrid Search (Local + SIMBAD)
  // We search within a 2-degree radius (typical wide field crop)
  const radius = 2.0;

  // Fire both queries in parallel
  const [localObjects, simbadObjects] = await Promise.all([
    // Local DB Query (Extremely fast, <10ms)
    Promise.resolve()
      .then(() =>
        queryLocalCatalog({
          ra: solveResult.ra,
          dec: solveResult.dec,
          radiusDeg: radius,
          maxMagnitude: hints.min_magnitude,
          types: hints.types,
          log,
        }),
      )
      .catch((err) => {
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
      log.warn(
        { err },
        "SIMBAD query failed; falling back to local catalog only",
      );
      warnings.push(
        "Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete.",
      );
      return [];
    }),
  ]);

  // Step 3: Deduplication & Merging
  const objects = mergeObjects(localObjects, simbadObjects);

  return {
    metadata: {
      ra: solveResult.ra,
      dec: solveResult.dec,
      scale: solveResult.scale,
      wcs: solveResult.wcsData,
      radius_searched: radius,
    },
    objects,
    warnings,
  };
}
