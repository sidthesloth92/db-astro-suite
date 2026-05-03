/**
 * Shared constants for celestial catalog processing.
 */

/**
 * Set of SIMBAD/local object type codes that represent stars (as opposed to DSOs).
 * Used for deduplication and merge logic.
 */
export const STAR_TYPES = new Set([
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
  "Star",
]);

/**
 * Accuracy priority for local star catalog sources — higher value = more accurate.
 * Used to prefer named entries over cross-matched catalogue IDs at the same position.
 */
export const CATALOG_PRIORITY = Object.freeze({ Named: 4, HIP: 3, TYC: 2 });

/** Spatial match threshold for star deduplication: 30 arcseconds expressed in degrees. */
export const MATCH_DEG = 30 / 3600;
