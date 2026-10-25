/**
 * Keplerian elements for approximate planet positions, valid 1800–2050
 * (JPL, "Keplerian Elements for Approximate Positions of the Major Planets").
 * Each entry: [a (au), e, I (°), L (°), ϖ (°), Ω (°)] at J2000 and their rates per Julian century.
 */
export interface PlanetElements {
  /** Display name. */
  name: string;
  /** Elements at J2000. */
  base: readonly [number, number, number, number, number, number];
  /** Rates per century. */
  rate: readonly [number, number, number, number, number, number];
  /** Approximate colour index (B−V) for rendering. */
  bv: number;
}

/** The Earth–Moon barycentre (used to get the observer's heliocentric position). */
export const EARTH_ELEMENTS: PlanetElements = {
  name: 'Earth',
  base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
  rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  bv: 0.6,
};

/** The five naked-eye planets. */
export const PLANET_ELEMENTS: readonly PlanetElements[] = [
  {
    name: 'Mercury',
    base: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    bv: 0.93,
  },
  {
    name: 'Venus',
    base: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    rate: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
    bv: 0.82,
  },
  {
    name: 'Mars',
    base: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    bv: 1.36,
  },
  {
    name: 'Jupiter',
    base: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    bv: 0.83,
  },
  {
    name: 'Saturn',
    base: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rate: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    bv: 1.04,
  },
];
