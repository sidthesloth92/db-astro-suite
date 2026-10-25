/**
 * HEALPix nested-scheme geometry (Górski et al. 2005), ported from the
 * healpix_bare reference: pixel ↔ direction, and continuous positions inside
 * a cell for tile meshes. Equatorial frame: θ from the north pole, φ = RA.
 */
import type { Vec3 } from '../models/sky.types';

const JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
const JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7];

/** Interleave the low 16 bits of x into even bit positions. */
function spreadBits(v: number): number {
  let x = v & 0xffff;
  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  return x;
}

/** Inverse of spreadBits. */
function compressBits(v: number): number {
  let x = v & 0x55555555;
  x = (x | (x >>> 1)) & 0x33333333;
  x = (x | (x >>> 2)) & 0x0f0f0f0f;
  x = (x | (x >>> 4)) & 0x00ff00ff;
  x = (x | (x >>> 8)) & 0x0000ffff;
  return x;
}

/** Number of pixels at a nested order. */
export function healpixNpix(order: number): number {
  return 12 * (1 << (2 * order));
}

/** Nested pixel index → (face, ix, iy). */
export function nestToXyf(order: number, pix: number): { face: number; ix: number; iy: number } {
  const face = pix >>> (2 * order);
  const inner = pix & ((1 << (2 * order)) - 1);
  return { face, ix: compressBits(inner), iy: compressBits(inner >>> 1) };
}

/** (face, ix, iy) → nested pixel index. */
export function xyfToNest(order: number, face: number, ix: number, iy: number): number {
  return (face << (2 * order)) + (spreadBits(ix) | (spreadBits(iy) << 1));
}

/**
 * Continuous position inside a face: x, y ∈ [0, 1] across the whole face
 * (not the cell), returning (z = cos θ, φ).
 */
export function xyfToLoc(x: number, y: number, face: number): { z: number; phi: number } {
  const jr = JRLL[face] - x - y;
  let nr: number;
  let z: number;
  if (jr < 1) {
    nr = jr;
    const tmp = (nr * nr) / 3;
    z = 1 - tmp;
  } else if (jr > 3) {
    nr = 4 - jr;
    const tmp = (nr * nr) / 3;
    z = tmp - 1;
  } else {
    nr = 1;
    z = ((2 - jr) * 2) / 3;
  }
  let tmp = JPLL[face] * nr + x - y;
  if (tmp < 0) tmp += 8;
  if (tmp >= 8) tmp -= 8;
  const phi = nr < 1e-15 ? 0 : (0.25 * Math.PI * tmp) / nr;
  return { z, phi };
}

/** Unit vector for (z, φ). */
export function locToVec(z: number, phi: number): Vec3 {
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return { x: s * Math.cos(phi), y: s * Math.sin(phi), z };
}

/**
 * Direction of a point inside nested cell `pix` at `order`, with fractional
 * offsets (u, v) ∈ [0, 1] along the cell's own x/y axes (0,0 = the cell's
 * lowest-index corner).
 */
export function cellPointToVec(order: number, pix: number, u: number, v: number): Vec3 {
  const nside = 1 << order;
  const { face, ix, iy } = nestToXyf(order, pix);
  const { z, phi } = xyfToLoc((ix + u) / nside, (iy + v) / nside, face);
  return locToVec(z, phi);
}

/** Centre direction of a nested cell. */
export function cellCenter(order: number, pix: number): Vec3 {
  return cellPointToVec(order, pix, 0.5, 0.5);
}

/** Nested pixel containing a unit direction. */
export function vecToNest(order: number, v: Vec3): number {
  const nside = 1 << order;
  const z = Math.max(-1, Math.min(1, v.z));
  let phi = Math.atan2(v.y, v.x);
  if (phi < 0) phi += 2 * Math.PI;
  const za = Math.abs(z);
  const tt = (phi * 2) / Math.PI; // [0, 4)
  let face: number;
  let ix: number;
  let iy: number;
  if (za <= 2 / 3) {
    const temp1 = nside * (0.5 + tt);
    const temp2 = nside * z * 0.75;
    const jp = Math.floor(temp1 - temp2);
    const jm = Math.floor(temp1 + temp2);
    const ifp = Math.floor(jp / nside);
    const ifm = Math.floor(jm / nside);
    face = ifp === ifm ? ifp | 4 : ifp < ifm ? ifp : ifm + 8;
    ix = jm & (nside - 1);
    iy = nside - (jp & (nside - 1)) - 1;
  } else {
    let ntt = Math.floor(tt);
    if (ntt >= 4) ntt = 3;
    const tp = tt - ntt;
    const sth = Math.sqrt(Math.max(0, 1 - z * z));
    const tmp = za > 0.99 ? (nside * sth) / Math.sqrt((1 + za) / 3) : nside * Math.sqrt(3 * (1 - za));
    let jp = Math.floor(tp * tmp);
    let jm = Math.floor((1 - tp) * tmp);
    if (jp >= nside) jp = nside - 1;
    if (jm >= nside) jm = nside - 1;
    if (z >= 0) {
      face = ntt;
      ix = nside - jm - 1;
      iy = nside - jp - 1;
    } else {
      face = ntt + 8;
      ix = jp;
      iy = jm;
    }
  }
  return xyfToNest(order, face, ix, iy);
}

/** Fractional position (u, v) of a direction inside its cell at `order` (for tests / picking). */
export function vecToCellUv(order: number, v: Vec3): { pix: number; u: number; v: number } {
  const pix = vecToNest(order, v);
  // Solve by local inversion: sample the cell's bilinear map and refine with a few Newton steps.
  let u = 0.5;
  let w = 0.5;
  for (let i = 0; i < 12; i++) {
    const p = cellPointToVec(order, pix, u, w);
    const e = 1e-4;
    const pu = cellPointToVec(order, pix, u + e, w);
    const pw = cellPointToVec(order, pix, u, w + e);
    const du = { x: (pu.x - p.x) / e, y: (pu.y - p.y) / e, z: (pu.z - p.z) / e };
    const dw = { x: (pw.x - p.x) / e, y: (pw.y - p.y) / e, z: (pw.z - p.z) / e };
    const r = { x: v.x - p.x, y: v.y - p.y, z: v.z - p.z };
    const a = du.x * du.x + du.y * du.y + du.z * du.z;
    const b = du.x * dw.x + du.y * dw.y + du.z * dw.z;
    const c = dw.x * dw.x + dw.y * dw.y + dw.z * dw.z;
    const ru = du.x * r.x + du.y * r.y + du.z * r.z;
    const rw = dw.x * r.x + dw.y * r.y + dw.z * r.z;
    const det = a * c - b * b;
    if (Math.abs(det) < 1e-18) break;
    const su = (ru * c - rw * b) / det;
    const sw = (rw * a - ru * b) / det;
    u += su;
    w += sw;
    if (Math.abs(su) < 1e-9 && Math.abs(sw) < 1e-9) break;
  }
  return { pix, u, v: w };
}
