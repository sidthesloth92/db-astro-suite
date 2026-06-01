/**
 * Pure conversions from the various distance measures each source catalogue
 * provides into a single display unit: light-years. Used by the catalog ingest
 * to populate the `objects.distanceLy` column from parallax (Gaia/Hipparcos),
 * distance modulus (HyperLEDA), distance in parsecs (MWSC), and distance in
 * kiloparsecs (Harris globulars).
 *
 * Every function returns `null` for a missing/invalid input so callers can
 * insert SQL NULL without branching.
 */

/** Light-years per parsec (IAU 2015 parsec / Julian light-year). */
export const LY_PER_PARSEC = 3.26156;

/** Hubble constant (km/s/Mpc) used for redshift → distance. */
export const HUBBLE_CONSTANT_KM_S_MPC = 70;

/**
 * @param {number | null | undefined} pc - Distance in parsecs
 * @returns {number | null} Light-years, or null when the input is non-finite/≤0
 */
export function parsecsToLy(pc) {
  if (pc == null || !Number.isFinite(pc) || pc <= 0) return null;
  return pc * LY_PER_PARSEC;
}

/**
 * @param {number | null | undefined} kpc - Distance in kiloparsecs
 * @returns {number | null} Light-years, or null when the input is non-finite/≤0
 */
export function kiloparsecsToLy(kpc) {
  if (kpc == null || !Number.isFinite(kpc) || kpc <= 0) return null;
  return kpc * 1000 * LY_PER_PARSEC;
}

/**
 * @param {number | null | undefined} mpc - Distance in megaparsecs
 * @returns {number | null} Light-years, or null when the input is non-finite/≤0
 */
export function megaparsecsToLy(mpc) {
  if (mpc == null || !Number.isFinite(mpc) || mpc <= 0) return null;
  return mpc * 1_000_000 * LY_PER_PARSEC;
}

/**
 * Converts a SIMBAD `mesDistance` measurement (a value plus a unit string of
 * `pc` / `kpc` / `Mpc`) into light-years. Unknown units return null.
 *
 * @param {number | null | undefined} value - Distance value
 * @param {string | null | undefined} unit - Unit string (case-insensitive)
 * @returns {number | null} Light-years, or null when unparseable
 */
export function measurementToLy(value, unit) {
  switch ((unit ?? '').trim().toLowerCase()) {
    case 'pc':
      return parsecsToLy(value);
    case 'kpc':
      return kiloparsecsToLy(value);
    case 'mpc':
      return megaparsecsToLy(value);
    default:
      return null;
  }
}

/**
 * Trigonometric parallax → distance. Only positive parallaxes yield a distance
 * (Gaia lists zero/negative parallaxes for distant or poorly-measured sources).
 *
 * @param {number | null | undefined} plxMas - Parallax in milliarcseconds
 * @returns {number | null} Light-years, or null when parallax is non-finite/≤0
 */
export function parallaxToLy(plxMas) {
  if (plxMas == null || !Number.isFinite(plxMas) || plxMas <= 0) return null;
  // distance_pc = 1000 / plx_mas; ×LY_PER_PARSEC → light-years.
  return parsecsToLy(1000 / plxMas);
}

/**
 * Distance modulus μ = m − M → distance. `d_pc = 10^((μ + 5) / 5)`.
 *
 * @param {number | null | undefined} mu - Distance modulus (magnitudes)
 * @returns {number | null} Light-years, or null when μ is non-finite
 */
export function distanceModulusToLy(mu) {
  if (mu == null || !Number.isFinite(mu)) return null;
  return parsecsToLy(Math.pow(10, (mu + 5) / 5));
}

/**
 * Recession velocity (cz) → Hubble distance in light-years (`d = cz / H0`). Only
 * meaningful well inside the Hubble flow — peculiar motion dominates (and can be
 * negative) nearby — so callers must gate on a minimum velocity before using it.
 *
 * @param {number | null | undefined} czKmS - Heliocentric recession velocity (km/s)
 * @param {number} [h0] - Hubble constant (km/s/Mpc)
 * @returns {number | null} Light-years, or null when cz is non-finite/≤0
 */
export function redshiftVelocityToLy(czKmS, h0 = HUBBLE_CONSTANT_KM_S_MPC) {
  if (czKmS == null || !Number.isFinite(czKmS) || czKmS <= 0) return null;
  const distMpc = czKmS / h0;
  return distMpc * 1_000_000 * LY_PER_PARSEC; // Mpc → pc → ly
}
