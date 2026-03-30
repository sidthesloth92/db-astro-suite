/**
 * Set of SIMBAD/local object types that represent stars (as opposed to DSOs).
 */
export const STAR_TYPES = new Set([
  "*", "**", "V*", "Ce*", "RR*", "LP*", "Mi*", "WR*", "C*", "Be*", "HB*", "WD*", "No*", "SN*",
  "Star",
]);

/**
 * Catalog accuracy priority for local star sources (higher = more accurate).
 */
const CATALOG_PRIORITY = { Named: 4, HIP: 3, TYC: 2 };

/** 30 arcseconds in degrees — spatial match threshold for deduplication. */
const MATCH_DEG = 30 / 3600;

/**
 * Merges and deduplicates objects from the local catalog and SIMBAD.
 *
 * @param {Array} localObjects - Objects from the local SQLite catalog
 * @param {Array} simbadObjects - Objects from the SIMBAD TAP service
 * @returns {Array} Deduplicated and merged list of celestial objects
 */
export function mergeObjects(localObjects, simbadObjects) {
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
  const localDSONames = new Set(localDSOs.map((o) => o.name.toLowerCase()));
  const simbadDSOs = simbadObjects.filter(
    (o) => !STAR_TYPES.has(o.type) && !localDSONames.has(o.name.toLowerCase()),
  );

  return [...localDSOs, ...localStarsByName.values(), ...simbadDSOs];
}
