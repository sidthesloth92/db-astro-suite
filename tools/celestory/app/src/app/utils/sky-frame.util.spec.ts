import { describe, expect, it } from 'vitest';
import { altAzToVec, camBasis, raDecToAltAz, toCam } from './celestial.util';
import { cameraMatrix, equatorialToEnuMatrix, j2000ToEnuMatrix, mat3Mul, mat3MulVec, mat3Transpose, precessionMatrix, raDecToUnit } from './sky-frame.util';

describe('sky-frame.util', () => {
  const lat = 40;
  const lon = -74;
  const date = new Date('2026-10-24T22:00:00Z');

  it('matches raDecToAltAz for a spread of sky positions', () => {
    const m = equatorialToEnuMatrix(lat, lon, date);
    for (const [ra, dec] of [
      [0, 0],
      [101.29, -16.72],
      [279.23, 38.78],
      [10.68, 41.27],
      [200, -60],
      [330, 85],
    ]) {
      const expected = altAzToVec(...Object.values(raDecToAltAz(ra, dec, lat, lon, date)) as [number, number]);
      const got = mat3MulVec(m, raDecToUnit(ra, dec));
      expect(got.x).toBeCloseTo(expected.x, 6);
      expect(got.y).toBeCloseTo(expected.y, 6);
      expect(got.z).toBeCloseTo(expected.z, 6);
    }
  });

  it('places the north celestial pole at altitude = latitude, due north', () => {
    const m = equatorialToEnuMatrix(lat, lon, date);
    const pole = mat3MulVec(m, { x: 0, y: 0, z: 1 });
    expect(pole.x).toBeCloseTo(0, 6);
    expect(pole.y).toBeCloseTo(Math.cos((lat * Math.PI) / 180), 6);
    expect(pole.z).toBeCloseTo(Math.sin((lat * Math.PI) / 180), 6);
  });

  it('builds a camera matrix equivalent to toCam', () => {
    const basis = camBasis(123, -20);
    const m = cameraMatrix(basis);
    const v = { x: 0.3, y: -0.5, z: Math.sqrt(1 - 0.09 - 0.25) };
    const expected = toCam(v, basis);
    const got = mat3MulVec(m, v);
    expect(got.x).toBeCloseTo(expected.cx, 6);
    expect(got.y).toBeCloseTo(expected.cy, 6);
    expect(got.z).toBeCloseTo(expected.cz, 6);
  });

  it('transposes rotations into their inverse', () => {
    const m = equatorialToEnuMatrix(lat, lon, date);
    const id = mat3Mul(mat3Transpose(m), m);
    const expected = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (let i = 0; i < 9; i++) {
      expect(id[i]).toBeCloseTo(expected[i], 6);
    }
  });
});

describe('precessionMatrix', () => {
  it('is the identity at J2000 and rotates by ~0.36° per 26 years', () => {
    const id = precessionMatrix(new Date('2000-01-01T12:00:00Z'));
    expect(id[0]).toBeCloseTo(1, 6);
    expect(id[4]).toBeCloseTo(1, 6);
    expect(id[8]).toBeCloseTo(1, 6);
    // Sirius, J2000 → 2026: RA grows by roughly 0.33°, Dec changes by a few arcminutes.
    const p = precessionMatrix(new Date('2026-10-24T22:00:00Z'));
    const sirius = mat3MulVec(p, raDecToUnit(101.2875, -16.7161));
    const ra = (Math.atan2(sirius.y, sirius.x) * 180) / Math.PI;
    const dec = (Math.asin(sirius.z) * 180) / Math.PI;
    expect(ra - 101.2875).toBeGreaterThan(0.25);
    expect(ra - 101.2875).toBeLessThan(0.45);
    expect(Math.abs(dec - -16.7161)).toBeLessThan(0.1);
  });

  it('keeps a J2000 star on the same horizon vector within precession via j2000ToEnuMatrix', () => {
    const date = new Date('2026-10-24T22:00:00Z');
    const direct = mat3MulVec(equatorialToEnuMatrix(40, -74, date), mat3MulVec(precessionMatrix(date), raDecToUnit(10, 20)));
    const combined = mat3MulVec(j2000ToEnuMatrix(40, -74, date), raDecToUnit(10, 20));
    expect(combined.x).toBeCloseTo(direct.x, 6);
    expect(combined.y).toBeCloseTo(direct.y, 6);
    expect(combined.z).toBeCloseTo(direct.z, 6);
  });
});
