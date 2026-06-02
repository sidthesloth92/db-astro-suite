import { normalizeName } from "../../src/utils/designation-key.util.js";

/**
 * Curated literature distances (light-years) for the famous, heavily-imaged
 * nebulae that SIMBAD's `mesDistance` table misses on the designation we look
 * up — either because a diffuse nebula has no catalogued distance of its own
 * (the measurement lives on its exciting star / cluster), or because the object
 * is split across several catalogue rows that don't merge (e.g. the Rosette's
 * NGC 2237/2238/2246).
 *
 * Applied at ingest ONLY to rows that are still null after SIMBAD, so SIMBAD
 * always wins where it has a value — for most of these the curated number is a
 * harmless backup that is never used. Keyed space/zero-padding-insensitively via
 * `normalizeName`, against the object's NGC/IC/M (or Barnard/Neb) designation.
 *
 * Values are rounded literature distances (NED / standard references); ±~15% is
 * fine for a display label. Grouped by nebula type.
 *
 * @type {ReadonlyArray<readonly [string, number]>}
 */
const FAMOUS_OBJECT_DISTANCES_LY = [
  // ── Emission nebulae (HII regions) ────────────────────────────────────────
  ["M 42", 1340], // Orion
  ["M 43", 1340], // De Mairan's
  ["M 8", 4100], // Lagoon
  ["M 16", 7000], // Eagle
  ["M 17", 5500], // Omega / Swan
  ["M 20", 5200], // Trifid
  ["NGC 7000", 2590], // North America
  ["IC 5070", 1800], // Pelican
  ["IC 1805", 7500], // Heart
  ["IC 1848", 7500], // Soul
  ["IC 1795", 7500], // Fishhead
  ["NGC 896", 7500], // Heart (NW knot)
  ["NGC 1499", 1000], // California
  ["NGC 2237", 5000], // Rosette
  ["NGC 2238", 5000], // Rosette
  ["NGC 2239", 5000], // Rosette
  ["NGC 2246", 5000], // Rosette
  ["NGC 2264", 2600], // Cone / Christmas Tree
  ["IC 405", 1500], // Flaming Star
  ["IC 410", 12000], // Tadpoles
  ["IC 417", 10000], // Spider
  ["NGC 1931", 7000], // Fly
  ["NGC 2174", 6400], // Monkey Head
  ["IC 2177", 3800], // Seagull
  ["IC 5146", 3300], // Cocoon
  ["IC 1396", 2400], // Elephant's Trunk
  ["NGC 7635", 7100], // Bubble
  ["NGC 6888", 4700], // Crescent
  ["NGC 7380", 7200], // Wizard
  ["NGC 281", 9200], // Pacman
  ["IC 1318", 4900], // Gamma Cygni / Sadr region
  ["NGC 6820", 6000], // around open cluster NGC 6823
  ["NGC 7822", 2900], // + Cederblad 214
  ["NGC 6960", 2400], // Veil — Western (Witch's Broom)
  ["NGC 6992", 2400], // Veil — Eastern
  ["NGC 6995", 2400], // Veil — Eastern
  ["NGC 6357", 8000], // Lobster / War and Peace
  ["NGC 6334", 5500], // Cat's Paw
  ["NGC 3372", 7500], // Carina
  ["NGC 3324", 7200], // Gabriela Mistral
  ["NGC 3576", 9000], // Statue of Liberty
  ["NGC 3603", 25000], // giant HII region
  ["IC 2944", 6500], // Running Chicken
  ["IC 4628", 6000], // Prawn
  ["NGC 2359", 12000], // Thor's Helmet
  ["NGC 1491", 10700], // Fossil Footprint
  ["NGC 2070", 160000], // Tarantula (in the LMC)
  ["NGC 6334", 5500],
  ["NGC 2467", 13000], // Skull and Crossbones
  ["NGC 6164", 4200], // Dragon's Egg

  // ── Reflection nebulae ────────────────────────────────────────────────────
  ["M 45", 444], // Pleiades nebulosity
  ["M 78", 1350],
  ["NGC 2068", 1350], // M 78
  ["NGC 7023", 1300], // Iris
  ["IC 2118", 900], // Witch Head
  ["NGC 1333", 1000],
  ["NGC 6726", 420], // Corona Australis complex
  ["IC 4592", 400], // Blue Horsehead

  // ── Planetary nebulae ─────────────────────────────────────────────────────
  ["M 57", 2300], // Ring
  ["M 27", 1360], // Dumbbell
  ["M 76", 2500], // Little Dumbbell
  ["M 97", 2030], // Owl
  ["NGC 7293", 650], // Helix
  ["NGC 6543", 3300], // Cat's Eye
  ["NGC 2392", 6500], // Eskimo / Clown Face
  ["NGC 7662", 5600], // Blue Snowball
  ["NGC 7009", 5000], // Saturn
  ["NGC 6826", 4000], // Blinking
  ["NGC 3242", 4800], // Ghost of Jupiter
  ["IC 418", 3600], // Spirograph
  ["NGC 6302", 3400], // Bug / Butterfly
  ["NGC 40", 3500], // Bow-Tie
  ["NGC 246", 1600], // Skull
  ["NGC 2438", 2900],

  // ── Supernova remnants ────────────────────────────────────────────────────
  ["M 1", 6500], // Crab
  ["IC 443", 5000], // Jellyfish

  // ── Dark nebulae ──────────────────────────────────────────────────────────
  ["B 33", 1375], // Horsehead
  ["Horsehead", 1375], // (our `Neb` special row)
  ["B 72", 650], // Snake
  ["B 142", 2000], // Barnard's E
  ["B 143", 2000], // Barnard's E
];

/**
 * Lookup keyed by `normalizeName(designation)` for ingest matching.
 *
 * @type {ReadonlyMap<string, number>}
 */
export const FAMOUS_DISTANCE_BY_KEY = new Map(
  FAMOUS_OBJECT_DISTANCES_LY.map(([name, ly]) => [normalizeName(name), ly]),
);
