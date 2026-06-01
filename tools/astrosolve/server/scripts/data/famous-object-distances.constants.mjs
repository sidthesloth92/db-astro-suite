import { normalizeName } from "../../src/utils/designation-key.util.js";

/**
 * Curated literature distances (light-years) for a handful of iconic nebulae
 * that SIMBAD's mesDistance table misses on their primary NGC/IC designation —
 * either because the object simply has no measured distance there, or because
 * the catalogue splits it across several rows that sit too far apart to merge
 * (e.g. the Rosette's NGC 2237/2238/2246). Applied at ingest ONLY to rows that
 * still lack a distance, so SIMBAD always wins where it has a value. Keyed
 * space/zero-padding-insensitively via `normalizeName`.
 *
 * @type {ReadonlyArray<readonly [string, number]>}
 */
const FAMOUS_OBJECT_DISTANCES_LY = [
  // Rosette Nebula — split across several NGC rows.
  ["NGC 2237", 5000],
  ["NGC 2238", 5000],
  ["NGC 2239", 5000],
  ["NGC 2246", 5000],
  // Other heavily-imaged emission/reflection nebulae.
  ["NGC 7000", 2590], // North America
  ["IC 5070", 1800], // Pelican
  ["IC 1805", 7500], // Heart
  ["IC 1848", 7500], // Soul
  ["NGC 1499", 1000], // California
  ["IC 5146", 3300], // Cocoon
  ["IC 405", 1500], // Flaming Star
  ["NGC 2264", 2600], // Cone / Christmas Tree
  ["IC 1396", 2400], // Elephant's Trunk
  ["IC 2118", 900], // Witch Head
  ["IC 2177", 3800], // Seagull
  ["NGC 6888", 4700], // Crescent
];

/**
 * Lookup keyed by `normalizeName(designation)` for ingest matching.
 *
 * @type {ReadonlyMap<string, number>}
 */
export const FAMOUS_DISTANCE_BY_KEY = new Map(
  FAMOUS_OBJECT_DISTANCES_LY.map(([name, ly]) => [normalizeName(name), ly]),
);
