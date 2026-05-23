/**
 * Maps a SIMBAD OTYPE code (also used by our local catalog) into one of
 * five coarse buckets so the `solve_events` analytics row can record a
 * per-type breakdown alongside the aggregate `objects_returned` count.
 *
 * The bucket set is intentionally small and stable — the admin dashboard
 * graphs against it, so adding a bucket later is a schema change.
 */

/**
 * Canonical bucket names. Frozen so callers can safely iterate and
 * pre-initialise a tally map (`{ stars: 0, galaxies: 0, ... }`).
 */
export const OBJECT_BUCKETS = Object.freeze([
  "stars",
  "galaxies",
  "nebulae",
  "clusters",
  "other",
]);

const STAR_CODES = new Set([
  "*", "**", "V*", "Ce*", "RR*", "LP*", "Mi*", "WR*", "C*",
  "Be*", "HB*", "WD*", "No*", "SN*",
]);

const GALAXY_CODES = new Set([
  "G", "EmG", "AGN", "Sy1", "Sy2", "Sy*", "LINER",
  "GiP", "GiG", "GiC", "BClG", "ClG",
]);

const NEBULA_CODES = new Set([
  "PN", "HII", "RNe", "DNe", "MoC", "EmO", "bub", "SNR",
]);

const CLUSTER_CODES = new Set([
  "OpC", "GlC", "Cl*", "As*",
]);

// Local catalog uses a separate `catalog` field for stellar entries
// (Named/HIP/TYC) whose `type` is the literal string "Star" rather than
// a SIMBAD code. Treat that as a star.
const STAR_TYPE_LITERALS = new Set(["Star"]);

/**
 * @param {string | null | undefined} otype - SIMBAD OTYPE or local-catalog `type`
 * @returns {"stars" | "galaxies" | "nebulae" | "clusters" | "other"}
 */
export function classifyType(otype) {
  if (!otype) return "other";
  if (STAR_TYPE_LITERALS.has(otype)) return "stars";
  if (STAR_CODES.has(otype)) return "stars";
  if (GALAXY_CODES.has(otype)) return "galaxies";
  if (NEBULA_CODES.has(otype)) return "nebulae";
  if (CLUSTER_CODES.has(otype)) return "clusters";
  return "other";
}
