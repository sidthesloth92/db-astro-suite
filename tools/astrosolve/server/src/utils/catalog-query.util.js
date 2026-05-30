import { STAR_MAGNITUDE_CUTOFFS } from "../constants/catalog.constants.js";

/**
 * Pure geometry/selection helpers for local-catalog region queries. Kept out
 * of the DAO so the DAO file holds query code only, and out of the service so
 * both layers can share the same RA-wrap and magnitude-cutoff logic.
 */

/**
 * Returns the faint-magnitude cutoff for stars given the search radius. Wider
 * fields use a brighter cutoff so they do not pull in millions of faint stars.
 *
 * @param {number} radiusDeg - Search radius (half-diagonal of the field) in degrees
 * @returns {number} The faintest stellar magnitude to include
 */
export function starMagnitudeCutoff(radiusDeg) {
  const r = Number(radiusDeg);
  const radius = Number.isFinite(r) ? r : Infinity;
  for (const tier of STAR_MAGNITUDE_CUTOFFS) {
    if (radius <= tier.maxRadiusDeg) return tier.magnitude;
  }
  // STAR_MAGNITUDE_CUTOFFS always ends with an Infinity catch-all, so this is
  // unreachable in practice; return the last tier's magnitude defensively.
  return STAR_MAGNITUDE_CUTOFFS[STAR_MAGNITUDE_CUTOFFS.length - 1].magnitude;
}

/**
 * Computes the declination bounds for a cone search. Dec does not wrap, so the
 * range is simply [dec - radius, dec + radius] clamped to the poles.
 *
 * @param {number} dec - Declination of the search center (degrees)
 * @param {number} radiusDeg - Search radius in degrees
 * @returns {{ minDec: number, maxDec: number }}
 */
export function decBounds(dec, radiusDeg) {
  return {
    minDec: Math.max(-90, dec - radiusDeg),
    maxDec: Math.min(90, dec + radiusDeg),
  };
}

/**
 * Computes the RA half-width of the bounding box at a given declination. The
 * box must widen in RA as |dec| grows (lines of RA converge at the poles).
 *
 * @param {number} dec - Declination of the search center (degrees)
 * @param {number} radiusDeg - Search radius in degrees
 * @returns {number} RA delta in degrees (capped at 180 = whole sky in RA)
 */
export function raDelta(dec, radiusDeg) {
  const cosDec = Math.cos((dec * Math.PI) / 180.0);
  const delta = radiusDeg / Math.max(0.01, Math.abs(cosDec));
  return Math.min(180, delta);
}

/**
 * Splits an RA cone into one or two non-wrapping [min, max] ranges in the
 * [0, 360) domain. A search centered near 0°/360° straddles the seam, so it
 * is returned as two ranges (e.g. [350, 360] and [0, 10]) — querying a single
 * `ra BETWEEN min AND max` across the seam would silently drop half the field.
 *
 * @param {number} ra - Right Ascension of the search center (degrees)
 * @param {number} dec - Declination of the search center (degrees)
 * @param {number} radiusDeg - Search radius in degrees
 * @returns {Array<{ minRA: number, maxRA: number }>} One or two RA ranges
 */
export function raRanges(ra, dec, radiusDeg) {
  const delta = raDelta(dec, radiusDeg);

  // Field spans the full RA circle (near a pole / very wide field).
  if (delta >= 180) {
    return [{ minRA: 0, maxRA: 360 }];
  }

  const min = ra - delta;
  const max = ra + delta;

  if (min < 0) {
    // Wraps below 0 → [0, max] and [360 + min, 360]
    return [
      { minRA: 0, maxRA: max },
      { minRA: 360 + min, maxRA: 360 },
    ];
  }
  if (max > 360) {
    // Wraps above 360 → [min, 360] and [0, max - 360]
    return [
      { minRA: min, maxRA: 360 },
      { minRA: 0, maxRA: max - 360 },
    ];
  }
  return [{ minRA: min, maxRA: max }];
}

/**
 * Angular RA separation (degrees) between two RA values, correct across the
 * 0/360 seam. Used by the conical spherical-distance refine so an object at
 * 359° is treated as 2° from a center at 1°, not 358°.
 *
 * @param {number} raA - First RA (degrees)
 * @param {number} raB - Second RA (degrees)
 * @returns {number} Smallest absolute RA separation in degrees (0–180)
 */
export function raSeparationDeg(raA, raB) {
  let diff = Math.abs(raA - raB) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}
