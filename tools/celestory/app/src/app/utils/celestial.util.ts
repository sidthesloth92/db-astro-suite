/**
 * Dependency-free positional-astronomy + projection engine for the planetarium.
 * Turns equatorial coords (RA/Dec) into the observer's local Alt/Az and an
 * East-North-Up unit vector, builds a camera basis for the look-around
 * projection, and procedurally generates the deep-sky backdrop. Ported from the
 * Celestory sky atlas (sky-data.js / planetarium.jsx).
 */
import { CAT_COLOR, OBJECT_COORDS } from '../models/sky-catalog.constants';
import type {
  AltAz,
  CamPoint,
  CameraBasis,
  EnuVector,
  GeneratedSky,
  RaDec,
  RgbColor,
  ScreenPoint,
  Vec3,
} from '../models/sky.types';

/** Degrees → radians. */
export const D2R = Math.PI / 180;
/** Radians → degrees. */
export const R2D = 180 / Math.PI;

// ---- vector helpers --------------------------------------------------------

/** Dot product of two vectors. */
export function vdot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Cross product of two vectors. */
export function vcross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** Build the camera basis (forward / right / up) from heading + pitch in degrees. */
export function camBasis(headingDeg: number, pitchDeg: number): CameraBasis {
  const h = headingDeg * D2R;
  const p = pitchDeg * D2R;
  const cf = Math.cos(p);
  const fwd: Vec3 = { x: cf * Math.sin(h), y: cf * Math.cos(h), z: Math.sin(p) };
  const right: Vec3 = { x: Math.cos(h), y: -Math.sin(h), z: 0 };
  const up = vcross(right, fwd);
  return { fwd, right, up };
}

/** Project an ENU unit vector to camera space {cx, cy, cz}. cz > 0 = in front. */
export function toCam(vec: Vec3, basis: CameraBasis): CamPoint {
  return { cx: vdot(vec, basis.right), cy: vdot(vec, basis.up), cz: vdot(vec, basis.fwd) };
}

/** Project a camera-space point to screen coordinates. */
export function camToScreen(c: CamPoint, focal: number, w: number, h: number): ScreenPoint {
  return { x: w / 2 + focal * (c.cx / c.cz), y: h / 2 - focal * (c.cy / c.cz) };
}

// ---- positional astronomy --------------------------------------------------

/** Julian date for a JS Date. */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time, degrees (0..360). */
export function gmst(date: Date): number {
  const jd = julianDate(date);
  const d = jd - 2451545.0;
  const t = d / 36525.0;
  let g = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000.0;
  g = g % 360;
  if (g < 0) g += 360;
  return g;
}

/** Local Sidereal Time, degrees. */
export function lst(date: Date, lonDeg: number): number {
  let l = (gmst(date) + lonDeg) % 360;
  if (l < 0) l += 360;
  return l;
}

/**
 * Equatorial (RA/Dec deg) → horizontal (alt/az deg). az measured from North,
 * increasing toward East.
 */
export function raDecToAltAz(raDeg: number, decDeg: number, latDeg: number, lonDeg: number, date: Date): AltAz {
  const ha = (lst(date, lonDeg) - raDeg) * D2R;
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  az = az + Math.PI; // measure from North, eastward
  let azDeg = (az * R2D) % 360;
  if (azDeg < 0) azDeg += 360;
  return { alt: alt * R2D, az: azDeg };
}

/** (alt, az deg) → East-North-Up unit vector. */
export function altAzToVec(altDeg: number, azDeg: number): EnuVector {
  const a = altDeg * D2R;
  const azimuth = azDeg * D2R;
  const ca = Math.cos(a);
  return { x: ca * Math.sin(azimuth), y: ca * Math.cos(azimuth), z: Math.sin(a) };
}

/** Direct equatorial → ENU vector for the given observer + instant (carries alt/az). */
export function raDecToVec(raDeg: number, decDeg: number, latDeg: number, lonDeg: number, date: Date): EnuVector {
  const aa = raDecToAltAz(raDeg, decDeg, latDeg, lonDeg, date);
  const v = altAzToVec(aa.alt, aa.az);
  v.alt = aa.alt;
  v.az = aa.az;
  return v;
}

// ---- Galactic → Equatorial (J2000) ----------------------------------------

/** Rows of the galactic → equatorial rotation matrix. */
const GAL2EQ: number[][] = [
  [-0.0548755604, 0.4941094279, -0.867666149],
  [-0.8734370902, -0.44482963, -0.1980763734],
  [-0.4838350155, 0.7469822445, 0.4559837762],
];

/** Galactic (l, b deg) → equatorial (RA/Dec deg, J2000). */
export function galToRaDec(lDeg: number, bDeg: number): RaDec {
  const l = lDeg * D2R;
  const b = bDeg * D2R;
  const cb = Math.cos(b);
  const g = [cb * Math.cos(l), cb * Math.sin(l), Math.sin(b)];
  const e = [
    GAL2EQ[0][0] * g[0] + GAL2EQ[0][1] * g[1] + GAL2EQ[0][2] * g[2],
    GAL2EQ[1][0] * g[0] + GAL2EQ[1][1] * g[1] + GAL2EQ[1][2] * g[2],
    GAL2EQ[2][0] * g[0] + GAL2EQ[2][1] * g[1] + GAL2EQ[2][2] * g[2],
  ];
  let ra = Math.atan2(e[1], e[0]) * R2D;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, e[2]))) * R2D };
}

// ---- procedural sky --------------------------------------------------------

/** Seeded PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller standard normal sample. */
function gauss(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Star colour from temperature t (0 = cool amber .. 1 = hot blue). */
function starColor(t: number): RgbColor {
  const cool: RgbColor = [255, 200, 150];
  const mid: RgbColor = [255, 246, 237];
  const hot: RgbColor = [188, 210, 255];
  let a: RgbColor;
  let b: RgbColor;
  let k: number;
  if (t < 0.5) {
    a = cool;
    b = mid;
    k = t / 0.5;
  } else {
    a = mid;
    b = hot;
    k = (t - 0.5) / 0.5;
  }
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

/** Generate the deterministic deep-sky backdrop (field, milky, clouds, dust, ha, galaxies). */
export function generateSky(): GeneratedSky {
  const rng = mulberry32(20240617);
  const field: GeneratedSky['field'] = [];
  const milky: GeneratedSky['milky'] = [];
  const clouds: GeneratedSky['clouds'] = [];
  const galaxies: GeneratedSky['galaxies'] = [];

  // uniform faint field
  for (let i = 0; i < 1300; i++) {
    const u = rng() * 2 - 1;
    const th = rng() * 2 * Math.PI;
    const dec = Math.asin(u) * R2D;
    const ra = th * R2D;
    const mag = 4.2 + rng() * 3.0;
    field.push({ ra, dec, mag, c: starColor(0.35 + rng() * 0.5) });
  }
  // Milky Way: stars concentrated on the galactic plane, denser toward the bulge (l~0)
  for (let i = 0; i < 900; i++) {
    const l = rng() * 360;
    const bulge = Math.cos(l * D2R) * 0.5 + 0.5;
    const sigma = 5 + 5 * (1 - bulge);
    const b = gauss(rng) * sigma;
    const rd = galToRaDec(l, b);
    const mag = 5.0 + rng() * 3.2 - bulge * 0.8;
    milky.push({ ra: rd.ra, dec: rd.dec, mag, c: starColor(0.3 + rng() * 0.55) });
  }
  // Milky Way diffuse star clouds (warm, dense — a continuous band, not puffs)
  for (let i = 0; i < 320; i++) {
    const l = rng() * 360;
    const bulge = Math.pow(Math.cos(l * D2R) * 0.5 + 0.5, 1.6);
    const b = gauss(rng) * (2.4 + 3.6 * (1 - bulge));
    const rd = galToRaDec(l, b);
    const col: RgbColor = [241, Math.round(223 - 13 * (1 - bulge)), Math.round(186 - 56 * (1 - bulge))];
    clouds.push({ ra: rd.ra, dec: rd.dec, ang: 0.06 + rng() * 0.06 + bulge * 0.14, a: 0.085 + 0.24 * bulge + rng() * 0.035, c: col });
  }
  // Dark dust lanes that carve the band (the Great Rift)
  const dust: GeneratedSky['dust'] = [];
  for (let i = 0; i < 70; i++) {
    const l = rng() * 360;
    const bulge = Math.cos(l * D2R) * 0.5 + 0.5;
    const b = gauss(rng) * 1.9 - 0.7;
    const rd = galToRaDec(l, b);
    dust.push({ ra: rd.ra, dec: rd.dec, ang: 0.035 + rng() * 0.06 + bulge * 0.05, a: 0.05 + 0.09 * bulge + rng() * 0.03 });
  }
  // Hydrogen-alpha emission regions: famous nebulae + scattered HII along the plane
  const haFamous: number[][] = [
    [83.8, -5.4, 0.045, 1.0], [85.0, -2.0, 0.11, 0.4], [314.7, 44.5, 0.055, 0.95], [313.2, 44.4, 0.04, 0.7],
    [38.2, 61.4, 0.05, 0.85], [44.5, 60.4, 0.045, 0.7], [60.0, 36.4, 0.06, 0.7], [98.0, 5.0, 0.04, 0.8],
    [270.9, -24.4, 0.05, 0.95], [270.6, -23.0, 0.03, 0.7], [274.7, -13.8, 0.035, 0.8], [275.2, -16.2, 0.03, 0.7],
    [161.3, -59.9, 0.07, 0.95], [305.6, 40.3, 0.06, 0.7], [311.4, 30.7, 0.04, 0.6], [350.1, 61.2, 0.03, 0.6],
    [13.2, 56.6, 0.04, 0.55], [228.0, -59.0, 0.05, 0.45],
  ];
  const ha: GeneratedSky['ha'] = haFamous.map((h) => ({ ra: h[0], dec: h[1], ang: h[2] * 1.2, a: 0.32 * h[3] }));
  for (let i = 0; i < 44; i++) {
    const l = rng() * 360;
    const bulge = Math.cos(l * D2R) * 0.5 + 0.5;
    const b = gauss(rng) * (2.0 + 2.4 * (1 - bulge));
    const rd = galToRaDec(l, b);
    ha.push({ ra: rd.ra, dec: rd.dec, ang: 0.025 + rng() * 0.04 + bulge * 0.04, a: 0.08 + 0.13 * bulge });
  }
  // a few galaxy / Magellanic-cloud smudges
  const gx: number[][] = [
    [10.68, 41.27, 0.05], [80.0, -69.8, 0.07], [13.2, -72.8, 0.05],
    [148.97, 69.68, 0.035], [201.36, -43.02, 0.035], [23.46, 30.66, 0.04],
  ];
  gx.forEach((g) => {
    galaxies.push({ ra: g[0], dec: g[1], ang: g[2], a: 0.16, ang2: g[2] * 0.5, rot: Math.random() * Math.PI });
  });
  return { field, milky, clouds, galaxies, dust, ha };
}

// ---- object coordinate lookup ----------------------------------------------

/** Normalise a designation to the OBJECT_COORDS key form (lowercase alphanumerics). */
export function coordKey(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Look up fallback RA/Dec for any of the given candidate designations/names. */
export function lookupObjectCoords(candidates: readonly string[]): readonly [number, number] | null {
  for (const cand of candidates) {
    const k = coordKey(cand);
    if (k && OBJECT_COORDS[k]) return OBJECT_COORDS[k];
  }
  return null;
}

/** Category → accent colour for sky markers. */
export function catColor(category: string): string {
  return CAT_COLOR[category] || CAT_COLOR['Other'];
}

/** A minimal object shape carrying (possibly missing) sky coordinates + names. */
export interface CoordCandidate {
  ra?: number;
  dec?: number;
  designation?: string;
  displayName?: string;
  aliases?: string[];
}

/**
 * Resolve an object's RA/Dec: its own coordinates if present, else a fallback
 * looked up from the catalogue by designation / name / aliases. Lets ledgers
 * that don't carry coordinates still light up the sky.
 */
export function objectRaDec(obj: CoordCandidate): readonly [number, number] | null {
  if (obj.ra != null && obj.dec != null) {
    return [obj.ra, obj.dec];
  }
  const cands = [obj.designation, obj.displayName, ...(obj.aliases || [])].filter((s): s is string => !!s);
  return lookupObjectCoords(cands);
}
