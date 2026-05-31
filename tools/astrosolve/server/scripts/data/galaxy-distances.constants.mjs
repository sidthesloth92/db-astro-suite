import { normalizeName } from "../../src/utils/designation-key.util.js";

/**
 * Curated redshift-INDEPENDENT distances (light-years) for the galaxies amateurs
 * actually recognise and photograph — every Messier galaxy, the Caldwell
 * galaxies, and a handful of famously-nicknamed NGCs. These nearby galaxies are
 * exactly the ones where a redshift→Hubble distance fails (peculiar motion
 * dominates, and several are blueshifted), so they are pinned to literature
 * values here. Faint/distant galaxies get their distance from RC3 redshift at
 * ingest instead (see the ingest's RC3 step).
 *
 * Values are rounded literature distances (NED median, ±~15% is fine for a
 * display label). Keyed by their primary designation; matched case/space/
 * zero-padding-insensitively via `normalizeName`, so the ingest can look one up
 * by either the Messier or NGC form.
 *
 * @type {ReadonlyArray<readonly [string, number]>}
 */
const CURATED_GALAXY_DISTANCES_LY = [
  // ── Messier galaxies ──────────────────────────────────────────────────────
  ["M 31", 2_500_000], // Andromeda
  ["M 32", 2_500_000],
  ["M 33", 2_730_000], // Triangulum
  ["M 49", 56_000_000],
  ["M 51", 27_000_000], // Whirlpool
  ["M 58", 62_000_000],
  ["M 59", 60_000_000],
  ["M 60", 55_000_000],
  ["M 61", 52_000_000],
  ["M 63", 29_300_000], // Sunflower
  ["M 64", 17_000_000], // Black Eye
  ["M 65", 35_000_000],
  ["M 66", 36_000_000],
  ["M 74", 32_000_000],
  ["M 77", 47_000_000],
  ["M 81", 12_000_000], // Bode's
  ["M 82", 12_000_000], // Cigar
  ["M 83", 15_000_000], // Southern Pinwheel
  ["M 84", 55_000_000],
  ["M 85", 60_000_000],
  ["M 86", 52_000_000],
  ["M 87", 53_000_000], // Virgo A
  ["M 88", 47_000_000],
  ["M 89", 50_000_000],
  ["M 90", 58_000_000],
  ["M 91", 63_000_000],
  ["M 94", 16_000_000],
  ["M 95", 33_000_000],
  ["M 96", 31_000_000],
  ["M 98", 44_000_000],
  ["M 99", 50_000_000],
  ["M 100", 55_000_000],
  ["M 101", 21_000_000], // Pinwheel
  ["M 102", 50_000_000], // NGC 5866 (Spindle)
  ["M 104", 31_000_000], // Sombrero
  ["M 105", 32_000_000],
  ["M 106", 23_700_000],
  ["M 108", 46_000_000],
  ["M 109", 84_000_000],
  ["M 110", 2_700_000],
  // ── Caldwell + famously-nicknamed NGC/IC galaxies ────────────────────────
  ["NGC 5128", 12_400_000], // C77 Centaurus A
  ["NGC 253", 11_400_000], // C65 Sculptor
  ["NGC 4565", 39_000_000], // C38 Needle
  ["NGC 4631", 25_000_000], // C32 Whale
  ["NGC 6946", 22_500_000], // C12 Fireworks
  ["NGC 891", 27_300_000], // C23
  ["NGC 2403", 8_000_000], // C7
  ["NGC 7331", 40_000_000], // C30
  ["NGC 300", 6_100_000], // C70
  ["NGC 55", 6_500_000], // C72
  ["IC 342", 11_000_000], // C5
  ["NGC 247", 11_100_000], // C62
  ["NGC 6822", 1_600_000], // C57 Barnard's Galaxy
  ["NGC 4038", 45_000_000], // C60 Antennae
  ["NGC 4039", 45_000_000], // C61 Antennae
  ["NGC 4945", 11_700_000], // C83
  ["NGC 4559", 29_000_000], // C36
  ["NGC 5005", 50_000_000], // C29
  ["NGC 2775", 67_000_000], // C48
  ["NGC 7479", 105_000_000], // C44
  ["NGC 185", 2_050_000], // C18
  ["NGC 4244", 14_000_000], // C26
  ["NGC 5248", 59_000_000], // C45
  ["NGC 3628", 35_000_000], // Hamburger (Leo Triplet)
  ["NGC 3079", 50_000_000],
  ["NGC 2841", 46_000_000],
  ["NGC 1300", 61_000_000],
  ["NGC 5907", 50_000_000], // Splinter
  ["NGC 3344", 22_500_000],
  ["NGC 6744", 30_000_000],
  ["NGC 1365", 56_000_000],
  ["NGC 1097", 45_000_000],
  ["NGC 5033", 38_000_000],
  ["NGC 4438", 52_000_000], // The Eyes
  ["NGC 2683", 25_000_000], // UFO Galaxy
];

/**
 * Lookup of curated galaxy distance keyed by `normalizeName(designation)` so the
 * ingest can resolve it from either the Messier or NGC/IC form of a row's name.
 *
 * @type {ReadonlyMap<string, number>}
 */
export const GALAXY_DISTANCE_BY_KEY = new Map(
  CURATED_GALAXY_DISTANCES_LY.map(([name, ly]) => [normalizeName(name), ly]),
);

/**
 * Resolves a curated galaxy distance for a designation, or null when absent.
 *
 * @param {string | null | undefined} designation
 * @returns {number | null}
 */
export function curatedGalaxyDistanceLy(designation) {
  if (!designation) return null;
  return GALAXY_DISTANCE_BY_KEY.get(normalizeName(designation)) ?? null;
}
