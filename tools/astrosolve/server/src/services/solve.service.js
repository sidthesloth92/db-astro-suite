import { solveWithAstrometry } from "./astrometry.service.js";
import { querySimbad } from "./simbad.service.js";
import { queryLocalCatalog } from "./local-catalog.service.js";

/**
 * Set of SIMBAD/local object types that represent stars (as opposed to DSOs).
 * Used to separate star-merging logic from DSO-merging logic.
 */
const STAR_TYPES = new Set([
  "*",
  "**",
  "V*",
  "Ce*",
  "RR*",
  "LP*",
  "Mi*",
  "WR*",
  "C*",
  "Be*",
  "HB*",
  "WD*",
  "No*",
  "SN*",
  "Star", // local catalog type used for HD, HIP, and named star entries
]);

/**
 * Catalog accuracy priority for local star sources (higher = more accurate).
 * Named = IAU WGSN approved names; highest priority so they display over HD numbers.
 */
const CATALOG_PRIORITY = { Named: 4, HIP: 3, TYC: 2 };

/** 30 arcseconds in degrees — spatial match threshold for deduplication. */
const MATCH_DEG = 30 / 3600;

/**
 * Merges and deduplicates objects from the local catalog and SIMBAD.
 *
 * Stars tier priority: SIMBAD (Gaia DR3) > HIP local (Hipparcos ~1 mas) > HD local (1920s ~10 arcsec)
 * DSOs priority: local (better common names/metadata) > SIMBAD fills gaps
 *
 * @param {Array} localObjects - Objects from the local SQLite catalog
 * @param {Array} simbadObjects - Objects from the SIMBAD TAP service
 * @returns {Array} Deduplicated and merged list of celestial objects
 */
function mergeObjects(localObjects, simbadObjects) {
  // Build best-per-name map from local stars (HIP beats HD when both present)
  const localStarsByName = new Map();
  for (const obj of localObjects.filter((o) => STAR_TYPES.has(o.type))) {
    const key = obj.name.toLowerCase();
    const cur = localStarsByName.get(key);
    const pri = CATALOG_PRIORITY[obj.catalog] || 0;
    if (!cur || pri > (CATALOG_PRIORITY[cur.catalog] || 0)) {
      localStarsByName.set(key, obj);
    }
  }

  // Remove HD/HIP/TYC entries shadowed by a Named catalog entry at the same position.
  // This prevents "HD 48915" and "Sirius" both appearing as annotations for the same star.
  const namedEntries = [...localStarsByName.values()].filter(
    (o) => o.catalog === "Named",
  );
  if (namedEntries.length > 0) {
    for (const [key, obj] of localStarsByName) {
      if (obj.catalog === "Named") continue;
      const cosDec = Math.cos(((obj.dec ?? 0) * Math.PI) / 180);
      const shadowed = namedEntries.some((n) => {
        const dRa = (n.ra - obj.ra) * cosDec;
        const dDec = n.dec - obj.dec;
        return dRa * dRa + dDec * dDec < MATCH_DEG * MATCH_DEG;
      });
      if (shadowed) localStarsByName.delete(key);
    }
  }

  // SIMBAD stars: update local entry position when names match (fast path), or
  // do a 30" spatial match to handle cases where SIMBAD MAIN_ID ≠ local HD name
  // (e.g. local has "HD 150679", SIMBAD returns the same star as "HIP 81693").
  // This prevents duplicate annotations for the same physical star.
  const localStarSnapshot = [...localStarsByName.values()]; // snapshot before updates

  for (const obj of simbadObjects.filter((o) => STAR_TYPES.has(o.type))) {
    const nameKey = obj.name.toLowerCase();

    // Fast path: SIMBAD name exactly matches a local star → position-correct it
    if (localStarsByName.has(nameKey)) {
      localStarsByName.set(nameKey, obj);
      continue;
    }

    // Spatial path: same physical star under a different identifier
    const cosDec = Math.cos(((obj.dec ?? 0) * Math.PI) / 180);
    const nearby = localStarSnapshot.find((s) => {
      const dRa = (obj.ra - s.ra) * cosDec;
      const dDec = obj.dec - s.dec;
      return dRa * dRa + dDec * dDec < MATCH_DEG * MATCH_DEG;
    });

    if (nearby) {
      // Position-correct the local entry (keeps HD name & catalog metadata)
      localStarsByName.set(nearby.name.toLowerCase(), {
        ...nearby,
        ra: obj.ra,
        dec: obj.dec,
      });
    } else {
      // Genuinely new object not in local catalog
      localStarsByName.set(nameKey, obj);
    }
  }

  // DSOs: local always wins; SIMBAD adds only what local doesn't have
  const localDSOs = localObjects.filter((o) => !STAR_TYPES.has(o.type));
  const localDSONames = new Set(localDSOs.map((o) => o.name.toLowerCase()));
  const simbadDSOs = simbadObjects.filter(
    (o) => !STAR_TYPES.has(o.type) && !localDSONames.has(o.name.toLowerCase()),
  );

  return [...localDSOs, ...localStarsByName.values(), ...simbadDSOs];
}

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
