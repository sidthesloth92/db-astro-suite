/**
 * Dependency-free positional-astronomy + projection engine for the planetarium.
 * Turns equatorial coords (RA/Dec) into the observer's local Alt/Az and an
 * East-North-Up unit vector, builds a camera basis for the look-around
 * projection. Ported from the Celestory sky atlas.
 */
import { CAT_COLOR, TARGET_COORDS } from '../models/sky-catalog.constants';
import type { AltAz, CamPoint, CameraBasis, EnuVector, RaDec, ScreenPoint, Vec3 } from '../models/sky.types';

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

// ---- target coordinate lookup ----------------------------------------------

/** Normalise a designation to the TARGET_COORDS key form (lowercase alphanumerics). */
export function coordKey(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Look up fallback RA/Dec for any of the given candidate designations/names. */
export function lookupTargetCoords(candidates: readonly string[]): readonly [number, number] | null {
  for (const cand of candidates) {
    const k = coordKey(cand);
    if (k && TARGET_COORDS[k]) return TARGET_COORDS[k];
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
 * Resolve a target's RA/Dec: its own coordinates if present, else a fallback
 * looked up from the catalogue by designation / name / aliases. Lets storys
 * that don't carry coordinates still light up the sky.
 */
export function targetRaDec(obj: CoordCandidate): readonly [number, number] | null {
  if (obj.ra != null && obj.dec != null) {
    return [obj.ra, obj.dec];
  }
  const cands = [obj.designation, obj.displayName, ...(obj.aliases || [])].filter((s): s is string => !!s);
  return lookupTargetCoords(cands);
}
