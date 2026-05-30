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
 * Accuracy/label priority for local star catalog sources — higher value wins
 * when two entries are the same star. Named (proper IAU name) beats HD-numbered
 * Hipparcos/Tycho, which beat anonymous Gaia survey stars. Gaia is lowest
 * because it contains essentially every bright star too, so it duplicates the
 * HD/named entries we already have with a friendlier label.
 */
export const CATALOG_PRIORITY = Object.freeze({ Named: 4, HIP: 3, TYC: 2, Gaia: 1 });

/**
 * Label priority across ALL catalogs (stars + DSOs), used when coincident
 * objects are merged into one annotation to pick which name shows by default.
 * Higher wins. Proper names and canonical DSO designations (Messier, NGC/IC,
 * Caldwell) outrank survey/anonymous catalog IDs (PGC, Milliquas, Gaia).
 * Catalogs not listed default to 0.
 */
export const CATALOG_LABEL_PRIORITY = Object.freeze({
  Named: 100,
  M: 90,
  "NGC/IC": 80,
  C: 75,
  Sh2: 60,
  LBN: 55,
  LDN: 55,
  Barnard: 55,
  ACO: 50,
  OCL: 50,
  Neb: 45,
  HIP: 30,
  TYC: 20,
  MILLIQUAS: 15,
  PGC: 12,
  Gaia: 5,
});

/**
 * Spatial match threshold for star deduplication: 30 arcseconds expressed in degrees.
 */
export const MATCH_DEG = 30 / 3600;

/**
 * Tighter threshold (5 arcseconds) for collapsing two star entries that are
 * literally the same star across catalogs (e.g. an HD star and its Gaia twin
 * sit <1 arcsec apart). Kept tight so genuinely separate close stars are not
 * merged away.
 */
export const STAR_COINCIDENCE_DEG = 5 / 3600;

/**
 * Maximum number of deep-sky objects (galaxies, IC, quasars, nebulae,
 * clusters) returned from the local catalog for a single field. DSOs are the
 * named targets users care about, so the cap is generous — it only guards
 * against a pathologically dense field (e.g. a galaxy cluster core).
 */
export const DSO_RESULT_CAP = 2000;

/**
 * Maximum number of stars returned from the local catalog for a single
 * field. Stars are returned brightest-first, so the cap keeps the densest
 * Gaia regions from overwhelming the response without dropping the stars a
 * viewer actually notices. Tuned up for deep-field use, where users want
 * faint field stars rendered around their targets.
 */
export const STAR_RESULT_CAP = 2500;

/**
 * Field-size-aware faint-magnitude cutoff for stars. A very wide field would
 * pull in an unmanageable number of faint Gaia stars, so the widest fields
 * still trim to brighter stars; narrow and medium fields (the deep-field case)
 * keep faint stars down to the catalog's G≤15 floor. Entries are evaluated in
 * order; the first whose `maxRadiusDeg` is at least the search radius wins.
 * The final entry is the catch-all for the widest fields.
 *
 * Radius here is the half-diagonal of the frame (see field-radius.util.js):
 *   narrow (≲0.5°, long focal length) → faint stars (mag ≤ 15)
 *   medium (≲3°)                      → faint stars (mag ≤ 15)
 *   wide   (>3°, short focal length)  → moderately faint (mag ≤ 12)
 *
 * NOTE: this cutoff only ever trims anonymous field STARS. Deep-sky objects
 * (galaxies, quasars, nebulae, clusters) are never magnitude-filtered — they
 * are always returned in full, capped only by DSO_RESULT_CAP.
 */
export const STAR_MAGNITUDE_CUTOFFS = Object.freeze([
  Object.freeze({ maxRadiusDeg: 0.5, magnitude: 15 }),
  Object.freeze({ maxRadiusDeg: 3.0, magnitude: 15 }),
  Object.freeze({ maxRadiusDeg: Infinity, magnitude: 12 }),
]);

/**
 * SIMBAD TAP row cap. Raised from the original 500 so the deep field returns
 * a richer object list; SIMBAD remains the secondary source behind the local
 * catalog after the deep-catalog ingest.
 */
export const SIMBAD_RESULT_CAP = 1500;
