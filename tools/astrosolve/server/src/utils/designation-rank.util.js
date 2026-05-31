import { CATALOG_LABEL_PRIORITY } from "../constants/catalog.constants.js";

/**
 * Designation-quality rank for a single object designation. Higher = a more
 * recognisable, canonical name. Used to order an object's alias list so the
 * nicest name (proper name / M / NGC / IC) leads and survey- or transient-style
 * designations trail.
 *
 * Ranking keys off the NAME PATTERN first — the `catalog` tag on coincident
 * entries is unreliable (a galaxy's "M 81" alias can arrive untagged), so the
 * shape of the designation is the trustworthy signal — then falls back to the
 * catalog-tag priority for anything unrecognised.
 *
 * @param {string} name - The designation text (e.g. "M 81", "PGC 28630").
 * @param {string} [catalog] - Optional catalog tag (e.g. "M", "PGC", "Named").
 * @returns {number} Higher is better; transient/survey junk scores below zero.
 */
export function rankDesignation(name, catalog) {
  const n = (name ?? "").trim();
  if (!n) return Number.NEGATIVE_INFINITY;

  // Proper IAU names (Sirius, Vega) carry no numeric shape; trust the tag.
  if (catalog === "Named") return 1000;

  // Canonical deep-sky designations, recognised by shape.
  if (/^M\s*\d+[a-z]?$/i.test(n)) return 900; // Messier (M 81)
  if (/^NGC\s*\d+[a-z]?$/i.test(n)) return 850; // NGC 3031
  if (/^IC\s*\d+[a-z]?$/i.test(n)) return 830; // IC 1396
  if (catalog === "C" || /^C\s*\d+$/i.test(n)) return 800; // Caldwell
  if (catalog === "Sh2" || /^sh\s*2?\s*-?\s*\d+$/i.test(n)) return 700; // Sharpless
  if (catalog === "Barnard" || /^B\s*\d+$/i.test(n)) return 650; // Barnard
  if (catalog === "ACO" || /^(ACO|Abell)\s*\d+$/i.test(n)) return 600; // Abell

  // Transient / survey-coordinate / bracketed designations — push to the
  // bottom. This is a safety net; the same-kind clustering already keeps most
  // of these out of an object's alias list.
  if (
    /^M?\s*\d+N\b/i.test(n) || // M81N 2006-02b (a nova *in* the galaxy)
    /\b(?:19|20)\d{2}-\d{2}\b/.test(n) || // any …YYYY-NN transient stamp
    /^(?:PNV|PSN|SN|AT|TCP)\b/i.test(n) || // possible-nova / supernova / transient
    /^\[.+\]/.test(n) || // [JCF89] 80, [NS2004] 4, [SMR2010] …
    /^J\d{4,}[+-]\d{4,}$/i.test(n) // bare coordinate name
  ) {
    return -100;
  }

  // Human-readable / well-known STAR catalogues (HR, HD, HIP, Bayer/Flamsteed,
  // BD/CD/CPD, SAO, Gliese). Per product intent these count as "named" and must
  // outrank anonymous survey stars (Gaia, TYC, 2MASS).
  if (/^HR\s*\d+/i.test(n)) return 560;
  if (/^HD\s*\d+/i.test(n)) return 550;
  if (/^(?:GJ|Gliese)\s*\d+/i.test(n)) return 545;
  if (/^HIP\s*\d+/i.test(n)) return 540;
  if (/^(?:BD|CD|CPD)[+-]\d+/i.test(n)) return 520;
  if (/^SAO\s*\d+/i.test(n)) return 510;

  // Recognised "ordinary" galaxy/cluster catalogs — better than anonymous
  // survey coordinates, but well below the canonical names above.
  if (/^(UGC|PGC|LEDA|MCG|CGCG|KUG|ESO|IRAS|2MASX|UGCA|Arp)\b/i.test(n)) {
    return 250 + (CATALOG_LABEL_PRIORITY[catalog] ?? 0);
  }

  // Fall back to the catalog-tag priority (0 when unknown).
  return CATALOG_LABEL_PRIORITY[catalog] ?? 0;
}
