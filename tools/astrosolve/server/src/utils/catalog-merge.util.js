import {
  STAR_TYPES,
  CATALOG_PRIORITY,
  MATCH_DEG,
} from "../catalog.constants.js";

/**
 * Merges and deduplicates celestial objects from the local catalog and SIMBAD.
 *
 * Strategy:
 * - Stars: local catalog wins by catalog priority (Named > HIP > TYC). SIMBAD stars
 *   refine position for name-matched or spatially-nearby local entries, or add new ones.
 * - DSOs: local always wins; SIMBAD adds only objects not already present within the
 *   spatial match threshold.
 *
 * @param {import('../models/solve.model.js').CatalogObject[]} localObjects - Objects from the local SQLite catalog
 * @param {import('../models/solve.model.js').CatalogObject[]} simbadObjects - Objects from the SIMBAD TAP service
 * @returns {import('../models/solve.model.js').CatalogObject[]} Deduplicated and merged list of celestial objects
 */
export function mergeObjects(localObjects, simbadObjects) {
  // Build best-per-name map from local stars (Named beats HIP/TYC when both present)
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

  const localStarSnapshot = [...localStarsByName.values()];

  for (const obj of simbadObjects.filter((o) => STAR_TYPES.has(o.type))) {
    const nameKey = obj.name.toLowerCase();

    if (localStarsByName.has(nameKey)) {
      localStarsByName.set(nameKey, obj);
      continue;
    }

    const cosDec = Math.cos(((obj.dec ?? 0) * Math.PI) / 180);
    const nearby = localStarSnapshot.find((s) => {
      const dRa = (obj.ra - s.ra) * cosDec;
      const dDec = obj.dec - s.dec;
      return dRa * dRa + dDec * dDec < MATCH_DEG * MATCH_DEG;
    });

    if (nearby) {
      localStarsByName.set(nearby.name.toLowerCase(), {
        ...nearby,
        ra: obj.ra,
        dec: obj.dec,
      });
    } else {
      localStarsByName.set(nameKey, obj);
    }
  }

  // DSOs: local always wins; SIMBAD adds only what local doesn't have
  const localDSOs = localObjects.filter((o) => !STAR_TYPES.has(o.type));
  const simbadDSOs = [];

  for (const obj of simbadObjects.filter((o) => !STAR_TYPES.has(o.type))) {
    const cosDec = Math.cos(((obj.dec ?? 0) * Math.PI) / 180);
    const nearby = localDSOs.some((s) => {
      const dRa = (obj.ra - s.ra) * cosDec;
      const dDec = obj.dec - s.dec;
      return dRa * dRa + dDec * dDec < MATCH_DEG * MATCH_DEG;
    });

    if (!nearby) {
      simbadDSOs.push(obj);
    }
  }

  return [...localDSOs, ...localStarsByName.values(), ...simbadDSOs];
}
