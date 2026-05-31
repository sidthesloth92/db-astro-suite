/**
 * Maps a SIMBAD OTYPE code (also used by our local catalog) into one of
 * six coarse buckets so the `solve_events` analytics row can record a
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
  "quasars",
  "nebulae",
  "clusters",
  "other",
]);

// Type codes → bucket. The lists cover BOTH the SIMBAD OTYPE vocabulary and the
// local catalogue's OpenNGC vocabulary (which differs: `OCl`/`GCl` vs SIMBAD's
// `OpC`/`GlC`, plus `GPair`/`GTrpl`/`GGroup`, `Neb`/`RfN`/`EmN`, `Cl+N`, `*Ass`,
// `Nova`, …). Matching is case-insensitive (see `CODE_TO_BUCKET`), so casing
// differences between the two sources never split one object across buckets.
const BUCKET_CODES = Object.freeze({
  stars: [
    "Star", // local-catalogue stellar literal (Named/HIP/TYC/Gaia rows)
    "*", "**", "V*", "Ce*", "RR*", "LP*", "Mi*", "WR*", "C*",
    "Be*", "HB*", "WD*", "No*", "SN*",
  ],
  // Quasars/AGN first so they win over the generic galaxy codes.
  quasars: ["QSO", "Bla", "AGN"],
  galaxies: [
    "G", "EmG", "Sy1", "Sy2", "Sy*", "LINER",
    "GiP", "GiG", "GiC", "BClG", "ClG",
    "GPair", "GTrpl", "GGroup", "GClus",
  ],
  nebulae: [
    "PN", "HII", "RNe", "DNe", "MoC", "EmO", "bub", "SNR",
    "Neb", "RfN", "EmN", "Nova",
  ],
  clusters: [
    "OpC", "GlC", "Cl*", "As*",
    "OCl", "GCl", "Cl+N", "*Ass",
  ],
});

// Lowercased code → bucket lookup, built once. Order of insertion does not
// matter because the source code vocabularies do not overlap across buckets.
const CODE_TO_BUCKET = new Map();
for (const [bucket, codes] of Object.entries(BUCKET_CODES)) {
  for (const code of codes) CODE_TO_BUCKET.set(code.toLowerCase(), bucket);
}

/**
 * @param {string | null | undefined} otype - SIMBAD OTYPE or local-catalog `type`
 * @returns {"stars" | "galaxies" | "quasars" | "nebulae" | "clusters" | "other"}
 */
export function classifyType(otype) {
  if (!otype) return "other";
  return CODE_TO_BUCKET.get(otype.toLowerCase()) ?? "other";
}

/**
 * Human-readable label for each coarse bucket, for display in the UI's
 * object-detail (right) pane.
 */
const BUCKET_LABELS = Object.freeze({
  stars: "Star",
  galaxies: "Galaxy",
  quasars: "Quasar",
  nebulae: "Nebula",
  clusters: "Cluster",
  other: "Other",
});

/**
 * Maps a type code to a human-readable category label (e.g. "G" → "Galaxy").
 *
 * @param {string | null | undefined} otype
 * @returns {string}
 */
export function categoryLabel(otype) {
  return BUCKET_LABELS[classifyType(otype)];
}
