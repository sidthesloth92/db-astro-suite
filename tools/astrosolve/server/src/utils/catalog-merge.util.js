import { CatalogObject } from "../models/solve.model.js";
import {
  STAR_TYPES,
  STAR_COINCIDENCE_DEG,
  DSO_MERGE_BASE_DEG,
  DSO_MERGE_SIZE_FRACTION,
} from "../constants/catalog.constants.js";
import { categoryLabel, classifyType } from "./object-classifier.util.js";
import { rankDesignation } from "./designation-rank.util.js";
import {
  designationKey,
  normalizeName,
  formatDesignation,
} from "./designation-key.util.js";

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
 * Builds the alias list for one object from its member designations: deduped by
 * name and ordered by designation quality (name-pattern aware) so the most
 * recognisable, human-readable name leads.
 *
 * @param {CatalogObject[]} members
 * @returns {{name:string,type:string,magnitude:(number|null),source:string,catalog:(string|undefined)}[]}
 */
function gatherAliases(members) {
  const byName = new Map();
  for (const m of members) {
    const key = normalizeName(m.name);
    if (!key || byName.has(key)) continue;
    byName.set(key, {
      name: formatDesignation(m.name),
      type: m.type,
      magnitude: m.magnitude ?? null,
      source: m.source,
      catalog: m.catalog,
    });
  }
  return [...byName.values()].sort(
    (a, b) =>
      rankDesignation(b.name, b.catalog) - rankDesignation(a.name, a.catalog),
  );
}

/**
 * Constructs one display object from a cluster of member designations that all
 * refer to the SAME physical object. The primary name/type/position come from
 * the best-ranked member (the most human-readable designation); `commonName`,
 * `magnitude` and `sizeArcmin` are filled from the first member that has them.
 *
 * @param {CatalogObject[]} members
 * @returns {CatalogObject}
 */
function buildSurvivor(members) {
  const rep = members.reduce(
    (best, m) =>
      rankDesignation(m.name, m.catalog) >
      rankDesignation(best.name, best.catalog)
        ? m
        : best,
    members[0],
  );
  const pick = (select) => {
    for (const m of members) {
      const v = select(m);
      if (v != null && v !== "") return v;
    }
    return null;
  };
  return new CatalogObject(
    formatDesignation(rep.name),
    rep.type,
    rep.ra,
    rep.dec,
    rep.magnitude ?? pick((m) => m.magnitude),
    rep.source,
    rep.catalog,
    rep.entryId,
    rep.commonName ?? pick((m) => m.commonName),
    rep.sizeArcmin ?? pick((m) => m.sizeArcmin),
    gatherAliases(members),
    [...new Set(members.map((m) => categoryLabel(m.type)))],
    rep.distanceLy ?? pick((m) => m.distanceLy),
  );
}

/**
 * Per-pair merge radius (degrees) for two DSOs of the same kind. A floor covers
 * catalogue position jitter; for extended objects it grows with a fraction of
 * the SMALLER object's angular diameter so a big galaxy's cross-catalogue rows
 * (which can be several arcsec apart) still merge, without a large galaxy
 * swallowing a small distinct neighbour.
 *
 * @param {CatalogObject} a
 * @param {CatalogObject} b
 * @returns {number}
 */
function dsoMergeRadius(a, b) {
  const sa = a.sizeArcmin ?? 0;
  const sb = b.sizeArcmin ?? 0;
  // Both sized → use the SMALLER diameter so a big galaxy cannot swallow a small
  // distinct neighbour. Only one sized (the other a sizeless SIMBAD row) → use
  // the known size, so a sizeless cross-ID still merges across catalogue jitter
  // instead of collapsing to the bare floor.
  const refArcmin = sa > 0 && sb > 0 ? Math.min(sa, sb) : Math.max(sa, sb);
  return Math.max(
    DSO_MERGE_BASE_DEG,
    DSO_MERGE_SIZE_FRACTION * (refArcmin / 60),
  );
}

/**
 * Clusters objects so each cluster is ONE physical object's cross-catalogue
 * designations. An entry joins an existing cluster only when it is the same
 * kind (`classifyType`), within `radiusFn` of a member, and its catalogue key
 * (`designationKey`) is not already present under a DIFFERENT designation — a
 * shared key with a different name means the catalogue listed two DISTINCT
 * objects, so they must stay separate. Names are compared space/case-insensitively
 * (`normalizeName`), so `"M 81"` and `"M  81"` count as the same designation.
 * Positional coincidence alone is never treated as identity.
 *
 * @param {CatalogObject[]} inputs
 * @param {(a: CatalogObject, b: CatalogObject) => number} radiusFn
 * @returns {CatalogObject[]} One survivor per cluster
 */
function clusterObjects(inputs, radiusFn) {
  const clusters = [];
  for (const obj of inputs) {
    const bucket = classifyType(obj.type);
    const key = designationKey(obj.name);
    const norm = normalizeName(obj.name);
    let target = null;
    for (const cl of clusters) {
      if (cl.bucket !== bucket) continue;
      // Same key under a DIFFERENT normalised name ⇒ two distinct objects of one
      // catalogue (two Gaia IDs, [ZBF2015] 41 vs 7) ⇒ never merge. The same
      // designation written differently (`M 81` vs `M  81`) is a duplicate and may merge.
      const existing = cl.keyNames.get(key);
      if (existing !== undefined && existing !== norm) continue;
      // An identical designation IS the same object, so merge it regardless of
      // the catalogue position gap (e.g. IC 63's local `IC0063` and SIMBAD
      // `IC 63` centres sit 19″ apart — past any size-free radius). Differently
      // named cross-catalogue designations still require positional coincidence.
      const sameDesignation = cl.members.some(
        (m) => normalizeName(m.name) === norm,
      );
      if (
        sameDesignation ||
        cl.members.some((m) => separationDeg(obj, m) <= radiusFn(obj, m))
      ) {
        target = cl;
        break;
      }
    }
    if (target) {
      target.members.push(obj);
      if (!target.keyNames.has(key)) target.keyNames.set(key, norm);
    } else {
      clusters.push({
        members: [obj],
        keyNames: new Map([[key, norm]]),
        bucket,
      });
    }
  }
  return clusters.map((cl) => buildSurvivor(cl.members));
}

/**
 * Merges and deduplicates celestial objects from the local catalog and SIMBAD.
 *
 * Strategy:
 * - Stars: local catalog wins by catalog priority (Named > HIP > TYC). SIMBAD stars
 *   refine position for name-matched or spatially-nearby local entries, or add new ones.
 * - DSOs: clustered by identity — coincident, same-kind designations from DIFFERENT
 *   catalogues collapse into one object (cross-IDs); distinct objects (including two
 *   entries of the same survey) stay separate. See `clusterObjects`.
 *
 * @param {CatalogObject[]} localObjects - Objects from the local SQLite catalog
 * @param {CatalogObject[]} simbadObjects - Objects from the SIMBAD TAP service
 * @returns {CatalogObject[]} Deduplicated and merged list of celestial objects
 */
export function mergeObjects(localObjects, simbadObjects) {
  const all = [...localObjects, ...simbadObjects];
  const stars = all.filter((o) => STAR_TYPES.has(o.type));
  const dsos = all.filter((o) => !STAR_TYPES.has(o.type));

  // Cluster each population by identity. Stars and DSOs are clustered apart so
  // a foreground star never groups with the galaxy behind it; within each, only
  // coincident, same-kind, different-catalogue designations of the SAME object
  // merge — distinct objects (including two entries of one survey) stay apart.
  return [
    ...clusterObjects(dsos, dsoMergeRadius),
    ...clusterObjects(stars, () => STAR_COINCIDENCE_DEG),
  ];
}
