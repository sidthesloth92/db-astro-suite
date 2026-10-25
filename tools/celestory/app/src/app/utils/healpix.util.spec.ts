import { describe, expect, it } from 'vitest';
import { cellCenter, cellPointToVec, healpixNpix, nestToXyf, vecToCellUv, vecToNest, xyfToNest } from './healpix.util';

function angleDeg(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const d = a.x * b.x + a.y * b.y + a.z * b.z;
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}

describe('healpix.util', () => {
  it('has 12 base cells at their known centres', () => {
    expect(healpixNpix(0)).toBe(12);
    // Faces 4..7 sit on the equator at φ = 0, 90, 180, 270°.
    for (let f = 4; f < 8; f++) {
      const c = cellCenter(0, f);
      expect(c.z).toBeCloseTo(0, 9);
      const phi = ((Math.atan2(c.y, c.x) * 180) / Math.PI + 360) % 360;
      expect(phi).toBeCloseTo(((f - 4) * 90) % 360, 6);
    }
    // Faces 0..3 are the northern cap at z = 2/3, φ = 45, 135, 225, 315°.
    for (let f = 0; f < 4; f++) {
      const c = cellCenter(0, f);
      expect(c.z).toBeCloseTo(2 / 3, 9);
      const phi = ((Math.atan2(c.y, c.x) * 180) / Math.PI + 360) % 360;
      expect(phi).toBeCloseTo(45 + f * 90, 6);
    }
    expect(cellCenter(0, 10).z).toBeCloseTo(-2 / 3, 9);
  });

  it('round-trips nested index ↔ (face, ix, iy)', () => {
    for (const order of [1, 3, 6]) {
      const n = healpixNpix(order);
      for (const pix of [0, 1, 7, Math.floor(n / 3), n - 1]) {
        const { face, ix, iy } = nestToXyf(order, pix);
        expect(xyfToNest(order, face, ix, iy)).toBe(pix);
      }
    }
  });

  it('finds the cell containing a cell centre (vec → pix round trip)', () => {
    for (const order of [2, 4, 7, 9]) {
      const n = healpixNpix(order);
      for (let k = 0; k < 40; k++) {
        const pix = Math.floor(((k * 7919) % n) + ((k * 104729) % 13)) % n;
        expect(vecToNest(order, cellCenter(order, pix))).toBe(pix);
      }
    }
  });

  it('keeps cell points inside the cell and makes cells the right size', () => {
    const order = 5;
    const pix = 1234;
    const c = cellCenter(order, pix);
    for (const [u, v] of [
      [0.1, 0.1],
      [0.9, 0.2],
      [0.5, 0.95],
      [0.02, 0.98],
    ]) {
      const p = cellPointToVec(order, pix, u, v);
      expect(vecToNest(order, p)).toBe(pix);
      // A cell at order 5 is ~1.83° across, so points stay within ~1.5° of the centre.
      expect(angleDeg(c, p)).toBeLessThan(1.6);
    }
  });

  it('inverts a direction to fractional cell coordinates', () => {
    const order = 6;
    const pix = 20000;
    const target = cellPointToVec(order, pix, 0.3, 0.8);
    const r = vecToCellUv(order, target);
    expect(r.pix).toBe(pix);
    expect(r.u).toBeCloseTo(0.3, 5);
    expect(r.v).toBeCloseTo(0.8, 5);
  });
});
