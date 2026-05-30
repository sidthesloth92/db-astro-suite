import { CatalogObject } from "../models/solve.model.js";
import {
  STAR_TYPES,
  CATALOG_PRIORITY,
  CATALOG_LABEL_PRIORITY,
  MATCH_DEG,
  STAR_COINCIDENCE_DEG,
} from "../constants/catalog.constants.js";
import { categoryLabel } from "./object-classifier.util.js";

/**
 * Angular separation in degrees between two RA/Dec points, using the local
 * small-angle approximation (fine at the arcsecond scale this is used for).
 *
 * @param {{ra:number,dec:number}} a
 * @param {{ra:number,dec:number}} b
 * @returns {number}
 */
function separationDeg(a, b) {
  const cosDec = Math.cos(((a.dec ?? 0) * Math.PI) / 180);
  const dRa = (a.ra - b.ra) * cosDec;
  const dDec = a.dec - b.dec;
  return Math.sqrt(dRa * dRa + dDec * dDec);
}

/**
 * Enriches each surviving merged object with `aliases` (every coincident input
 * designation, including catalog entries the dedup dropped) and `categories`
 * (distinct human-readable type labels). The default name/type stay as the
 * dedup already chose, but `aliases` is ordered by CATALOG_LABEL_PRIORITY so
 * the UI can offer the best alternative names first.
 *
 * @param {CatalogObject[]} survivors - The deduplicated objects to display
 * @param {CatalogObject[]} allInputs - Every object from both catalogs (pre-dedup)
 * @returns {CatalogObject[]} New objects carrying aliases + categories
 */
function enrichWithAliases(survivors, allInputs) {
  return survivors.map((obj) => {
    const isStar = STAR_TYPES.has(obj.type);
    const threshold = isStar ? STAR_COINCIDENCE_DEG : MATCH_DEG;

    const coincident = allInputs.filter(
      (cand) => separationDeg(obj, cand) <= threshold,
    );

    // Dedup aliases by name (keep the first/highest-priority occurrence), then
    // order by catalog label priority so the nicest name leads.
    const byName = new Map();
    for (const c of coincident) {
      const key = (c.name ?? "").toLowerCase();
      if (!key || byName.has(key)) continue;
      byName.set(key, {
        name: c.name,
        type: c.type,
        magnitude: c.magnitude ?? null,
        source: c.source,
        catalog: c.catalog,
      });
    }
    const aliases = [...byName.values()].sort(
      (a, b) =>
        (CATALOG_LABEL_PRIORITY[b.catalog] || 0) -
        (CATALOG_LABEL_PRIORITY[a.catalog] || 0),
    );

    const categories = [...new Set(coincident.map((c) => categoryLabel(c.type)))];

    return new CatalogObject(
      obj.name,
      obj.type,
      obj.ra,
      obj.dec,
      obj.magnitude,
      obj.source,
      obj.catalog,
      obj.entryId,
      obj.commonName,
      obj.sizeArcmin,
      aliases,
      categories,
    );
  });
}

/**
 * Merges and deduplicates celestial objects from the local catalog and SIMBAD.
 *
 * Strategy:
 * - Stars: local catalog wins by catalog priority (Named > HIP > TYC). SIMBAD stars
 *   refine position for name-matched or spatially-nearby local entries, or add new ones.
 * - DSOs: local always wins; SIMBAD adds only objects not already present within the
 *   spatial match threshold.
 *
 * @param {CatalogObject[]} localObjects - Objects from the local SQLite catalog
 * @param {CatalogObject[]} simbadObjects - Objects from the SIMBAD TAP service
 * @returns {CatalogObject[]} Deduplicated and merged list of celestial objects
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

  // Collapse coincident stars across catalogs. Gaia contains essentially every
  // bright star, so each HD/named star has a Gaia twin <1 arcsec away; without
  // this, the same star renders twice. For any two entries within
  // STAR_COINCIDENCE_DEG, keep the higher-priority catalog (Named > HIP > TYC >
  // Gaia) and drop the rest. Uses the tight coincidence threshold so genuinely
  // separate close stars are preserved.
  const allStars = [...localStarsByName.values()];
  const dropped = new Set();
  for (let i = 0; i < allStars.length; i++) {
    if (dropped.has(i)) continue;
    const a = allStars[i];
    const cosDec = Math.cos(((a.dec ?? 0) * Math.PI) / 180);
    for (let j = i + 1; j < allStars.length; j++) {
      if (dropped.has(j)) continue;
      const b = allStars[j];
      const dRa = (a.ra - b.ra) * cosDec;
      const dDec = a.dec - b.dec;
      if (dRa * dRa + dDec * dDec >= STAR_COINCIDENCE_DEG * STAR_COINCIDENCE_DEG) {
        continue;
      }
      // Same star in two catalogs — keep the higher-priority one.
      const priA = CATALOG_PRIORITY[a.catalog] || 0;
      const priB = CATALOG_PRIORITY[b.catalog] || 0;
      if (priB > priA) {
        dropped.add(i);
        break; // a is gone; stop comparing it against the rest
      } else {
        dropped.add(j);
      }
    }
  }
  for (let i = 0; i < allStars.length; i++) {
    if (dropped.has(i)) localStarsByName.delete(allStars[i].name.toLowerCase());
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
      localStarsByName.set(
        nearby.name.toLowerCase(),
        new CatalogObject(
          nearby.name,
          nearby.type,
          obj.ra,
          obj.dec,
          nearby.magnitude,
          nearby.source,
          nearby.catalog,
          nearby.entryId,
          nearby.commonName,
          nearby.sizeArcmin,
        ),
      );
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

  const survivors = [
    ...localDSOs,
    ...localStarsByName.values(),
    ...simbadDSOs,
  ];
  // Attach all coincident designations + category labels to each survivor so
  // the UI can show every name and let the user pick which one to label.
  return enrichWithAliases(survivors, [...localObjects, ...simbadObjects]);
}
