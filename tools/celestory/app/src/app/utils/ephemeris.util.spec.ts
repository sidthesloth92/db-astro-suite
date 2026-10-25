import { describe, expect, it } from 'vitest';
import { eclipticPoleUnit, moonAppearance, moonPosition, sunPosition } from './ephemeris.util';

describe('ephemeris.util', () => {
  it('puts the Sun on the celestial equator at the March equinox', () => {
    const sun = sunPosition(new Date('2026-03-20T14:46:00Z'));
    expect(Math.abs(sun.dec)).toBeLessThan(0.1);
    expect(sun.ra < 0.5 || sun.ra > 359.5).toBe(true);
  });

  it('puts the Sun near +23.4° declination at the June solstice', () => {
    const sun = sunPosition(new Date('2026-06-21T08:24:00Z'));
    expect(sun.dec).toBeGreaterThan(23.3);
    expect(sun.dec).toBeLessThan(23.5);
    expect(sun.ra).toBeGreaterThan(89);
    expect(sun.ra).toBeLessThan(91);
  });

  it('reports a nearly full Moon on 2026-10-26 and a new Moon on 2026-10-10', () => {
    const full = moonAppearance(new Date('2026-10-26T04:00:00Z'), 40, -74);
    expect(full.illuminated).toBeGreaterThan(0.98);
    const nu = moonAppearance(new Date('2026-10-10T16:00:00Z'), 40, -74);
    expect(nu.illuminated).toBeLessThan(0.02);
  });

  it('gives the Moon a ~0.5° apparent diameter and a plausible distance', () => {
    const m = moonPosition(new Date('2026-10-24T22:00:00Z'), 40, -74);
    expect(m.distance).toBeGreaterThan(356000);
    expect(m.distance).toBeLessThan(407000);
    const app = moonAppearance(new Date('2026-10-24T22:00:00Z'), 40, -74);
    expect(app.diameterDeg).toBeGreaterThan(0.48);
    expect(app.diameterDeg).toBeLessThan(0.57);
  });

  it('shifts the Moon by parallax between antipodal observers', () => {
    const date = new Date('2026-10-24T22:00:00Z');
    const a = moonPosition(date, 40, -74);
    const b = moonPosition(date, -40, 106);
    const cosSep = a.unit.x * b.unit.x + a.unit.y * b.unit.y + a.unit.z * b.unit.z;
    const sepDeg = (Math.acos(Math.min(1, cosSep)) * 180) / Math.PI;
    expect(sepDeg).toBeGreaterThan(0.5);
    expect(sepDeg).toBeLessThan(2.1);
  });

  it('returns a unit ecliptic pole tilted by the obliquity', () => {
    const p = eclipticPoleUnit(new Date('2026-01-01T00:00:00Z'));
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 9);
    expect(Math.acos(p.z) * (180 / Math.PI)).toBeCloseTo(23.44, 1);
  });
});
