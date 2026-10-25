/**
 * Per-frame transforms shared by the WebGL sky and the 2D overlay: the
 * equatorial → East-North-Up rotation for an observer + instant, and the
 * camera basis as a column-major mat3 for shaders.
 *
 * Frames: equatorial unit vectors are (cos δ cos α, cos δ sin α, sin δ) in J2000.
 * ENU is x = east, y = north, z = up. Camera space is x = right, y = up, z = forward.
 */
import type { CameraBasis, EnuVector, Vec3 } from '../models/sky.types';
import { D2R, julianDate, lst } from './celestial.util';

/** A column-major 3×3 matrix as 9 numbers (WebGL `uniformMatrix3fv` layout). */
export type Mat3 = Float32Array;

/** Multiply a column-major mat3 by a vector. */
export function mat3MulVec(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[3] * v.y + m[6] * v.z,
    y: m[1] * v.x + m[4] * v.y + m[7] * v.z,
    z: m[2] * v.x + m[5] * v.y + m[8] * v.z,
  };
}

/** Multiply two column-major mat3s (a · b). */
export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const o = new Float32Array(9);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
    }
  }
  return o;
}

/** Transpose (= inverse for rotations). */
export function mat3Transpose(m: Mat3): Mat3 {
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
}

/**
 * Equatorial (J2000) → ENU rotation for latitude `latDeg`, longitude `lonDeg`
 * at `date`. Equivalent to `raDecToAltAz` + `altAzToVec` in celestial.util.
 */
export function equatorialToEnuMatrix(latDeg: number, lonDeg: number, date: Date): Mat3 {
  const theta = lst(date, lonDeg) * D2R;
  const phi = latDeg * D2R;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  // Step 1: rotate about the pole by −LST → hour-angle frame (x toward the meridian,
  // y = −east-ish, z = pole): xh = ct·x + st·y, yh = −st·x + ct·y, zh = z.
  // Step 2: hour-angle frame → ENU: east = yh, north = −sp·xh + cp·zh, up = cp·xh + sp·zh.
  // Column-major: column j holds the image of basis vector e_j.
  return new Float32Array([
    // e_x → (yh = −st, north = −sp·ct, up = cp·ct)
    -st,
    -sp * ct,
    cp * ct,
    // e_y → (yh = ct, north = −sp·st, up = cp·st)
    ct,
    -sp * st,
    cp * st,
    // e_z → (0, cp, sp)
    0,
    cp,
    sp,
  ]);
}

/**
 * Precession rotation J2000 → mean equator/equinox of `date` (IAU 1976, Meeus 21.3),
 * column-major. Accurate to well under an arcminute for decades around J2000.
 */
export function precessionMatrix(date: Date): Mat3 {
  const T = (julianDate(date) - 2451545.0) / 36525;
  const arcsec = D2R / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * arcsec;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * arcsec;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * arcsec;
  const cz = Math.cos(zeta);
  const sz = Math.sin(zeta);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  // P = Rz(−z) · Ry(θ) · Rz(−ζ), written out (Meeus 21.4 coefficients), column-major.
  const xx = cz * ct * cZ - sz * sZ;
  const yx = -sz * ct * cZ - cz * sZ;
  const zx = -st * cZ;
  const xy = cz * ct * sZ + sz * cZ;
  const yy = -sz * ct * sZ + cz * cZ;
  const zy = -st * sZ;
  const xz = cz * st;
  const yz = -sz * st;
  const zz = ct;
  return new Float32Array([xx, xy, xz, yx, yy, yz, zx, zy, zz]);
}

/** J2000 equatorial → ENU for the observer + instant, including precession to date. */
export function j2000ToEnuMatrix(latDeg: number, lonDeg: number, date: Date): Mat3 {
  return mat3Mul(equatorialToEnuMatrix(latDeg, lonDeg, date), precessionMatrix(date));
}

/** ENU → camera-space rotation (rows = right, up, forward) as a column-major mat3. */
export function cameraMatrix(basis: CameraBasis): Mat3 {
  const { right, up, fwd } = basis;
  return new Float32Array([right.x, up.x, fwd.x, right.y, up.y, fwd.y, right.z, up.z, fwd.z]);
}

/** Equatorial unit vector for RA/Dec in degrees. */
export function raDecToUnit(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return { x: cd * Math.cos(ra), y: cd * Math.sin(ra), z: Math.sin(dec) };
}

/** Altitude in degrees of an ENU unit vector. */
export function enuAltitudeDeg(v: EnuVector | Vec3): number {
  return Math.asin(Math.max(-1, Math.min(1, v.z))) / D2R;
}
