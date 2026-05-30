/**
 * Catalog/survey identity of a designation, used to decide whether two
 * coincident entries are the SAME object or merely distinct objects from the
 * same catalogue.
 *
 * A catalogue never lists the same object twice, so two designations that share
 * a key (e.g. `[ZBF2015] NGC6207 41` and `… 7`, or two different `PGC` numbers)
 * are DIFFERENT objects. Two coincident designations with DIFFERENT keys (e.g.
 * `NGC 3031` and `PGC 28630`) are cross-identifications of ONE object.
 *
 * The key is the designation with its trailing identifier removed — the final
 * running number, a `YYYY-NN` transient stamp, or a `J…±…` coordinate — then
 * whitespace-collapsed and upper-cased. Proper names (no trailing identifier,
 * e.g. "Sirius") are their own key, so they only ever merge with a coincident,
 * differently-keyed catalogue designation.
 *
 * @param {string} name - The designation text (e.g. "NGC 3031").
 * @returns {string} The catalogue/survey key (e.g. "NGC").
 */
export function designationKey(name) {
  const n = (name ?? "").trim();
  if (!n) return "";

  let key = n;
  // Strip a trailing identifier, trying the most specific shapes first.
  const trailing = [
    /\s*J\d{2,}[+-]\d{2,}[A-Za-z]?$/, // coordinate name: "PNV J09553556+6904271"
    /\s+(?:19|20)\d{2}-\d{2}[A-Za-z]?$/, // transient stamp: "M81N 2006-02b"
    /\s+\d+[A-Za-z]?$/, // running number: "NGC 3031", "[ZBF2015] NGC6207 41"
    /\d+[A-Za-z]?$/, // glued number: "M81", "Sh2-155"
  ];
  for (const re of trailing) {
    if (re.test(key)) {
      key = key.replace(re, "");
      break;
    }
  }

  // Normalise: collapse internal whitespace, trim separators, upper-case.
  key = key.replace(/\s+/g, " ").replace(/[\s-]+$/, "").trim().toUpperCase();
  return key || n.toUpperCase();
}

/**
 * Identity form of a designation for *comparing* two names — upper-cased with
 * all whitespace removed — so spacing variants count as the same designation
 * (`"M 81"`, `"M  81"`, `"M81"` → `"M81"`; `"NGC3031"`, `"NGC 3031"` → `"NGC3031"`).
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return (name ?? "").toUpperCase().replace(/\s+/g, "");
}

// Clean alphabetic catalogue prefixes that take a single space before their
// number for display. Excludes digit-containing prefixes (Sh2, 2MASS) and
// bracketed survey names, which must be left untouched.
const DISPLAY_SPACED_PREFIXES = /^(NGC|IC|M|C|HD|HR|HIP|UGC|PGC|MCG|SAO|GJ|BD|CD)(\d)/i;

/**
 * Display form of a designation: collapse repeated whitespace and insert a
 * single space between a well-known catalogue prefix and its number, so chips
 * and labels read `"NGC 3031"`, `"M 81"`, `"HD 46105A"`. Names that don't match
 * a whitelisted prefix (`Sh2-155`, `2MASS J…`, `[ZBF2015] …`) are returned with
 * whitespace collapsed only.
 *
 * @param {string} name
 * @returns {string}
 */
export function formatDesignation(name) {
  const s = (name ?? "").trim().replace(/\s+/g, " ");
  return s.replace(DISPLAY_SPACED_PREFIXES, "$1 $2");
}
