/**
 * Patterns + catalogue tags that identify a "named" annotation — one with a
 * real, human-recognisable catalogue designation. Consumed by
 * `isNamedAnnotation` (see `annotation-named.util.ts`) to drive the
 * "Named objects only" declutter filter.
 *
 * These mirror the taxonomy the backend encodes in `designation-rank.util.js`,
 * expressed here as front-end matchers against the data already present on each
 * `ImageAnnotation` (`name`, `label`, `aliases`, `catalog`).
 */

/**
 * `catalog`-field values that are inherently named. Fast-path before the
 * name-pattern scan. Uppercased; compared against `ann.catalog.toUpperCase()`.
 */
export const NAMED_CATALOG_TAGS: ReadonlySet<string> = new Set([
  'M',
  'C',
  'NGC/IC',
  'NGC',
  'IC',
  'SH2',
  'ACO',
  'HD',
]);

/**
 * Designation patterns recognised as named, matched against a name/alias string
 * that has already been uppercased and trimmed. Deep-sky catalogues
 * (Messier/NGC/IC/Caldwell/Sharpless/Abell) plus named-star catalogues
 * (HD/HIP/HR) and Bayer (Greek-letter) star designations.
 *
 * Anchored at the start so survey IDs that merely contain these letters later
 * (e.g. `[ZBF2015] NGC6207 41`, `2MASS J…`) do not match.
 */
export const NAMED_DESIGNATION_PATTERNS: readonly RegExp[] = [
  /^M\s*\d/, // Messier — M 81 / M81
  /^NGC\s*\d/, // NGC 3031
  /^IC\s*\d/, // IC 63
  /^C\s*\d/, // Caldwell — C 14
  /^SH\s*2-?\s*\d/, // Sharpless — Sh2-155
  /^(ACO|ABELL)\s*\d/, // Abell cluster — ACO 2151 / Abell 2151
  /^HD\s*\d/, // Henry Draper — HD 46105
  /^HIP\s*\d/, // Hipparcos — HIP 24436
  /^HR\s*\d/, // Bright Star (Harvard Revised) — HR 1948
  // Bayer designation — Greek-letter abbreviation + constellation (e.g.
  // "ALF Ori", "* BET Cyg"). SIMBAD prefixes a literal "*" on some forms.
  /^\*?\s*(ALF|BET|GAM|DEL|EPS|ZET|ETA|TET|THE|IOT|KAP|LAM|MU|NU|KSI|OMI|PI|RHO|SIG|TAU|UPS|PHI|CHI|PSI|OME)\s+\S/,
];
