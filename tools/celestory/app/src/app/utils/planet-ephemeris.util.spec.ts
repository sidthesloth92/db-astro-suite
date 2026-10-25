import { describe, expect, it } from 'vitest';
import { planetPositions } from './planet-ephemeris.util';

/** JPL Horizons, geocentric astrometric J2000 (quantity 1), 2026-10-24 22:00 UT: [RA°, Dec°, V mag]. */
const HORIZONS: Record<string, [number, number, number]> = {
  Mercury: [227.30907, -20.73371, 0.597],
  Venus: [205.48074, -17.40242, -4.191],
  Mars: [137.51145, 17.84306, 0.877],
  Jupiter: [145.59632, 14.46834, -1.967],
  Saturn: [9.67552, 1.2326, 0.429],
};

function sepDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const d = Math.PI / 180;
  const c = Math.sin(dec1 * d) * Math.sin(dec2 * d) + Math.cos(dec1 * d) * Math.cos(dec2 * d) * Math.cos((ra1 - ra2) * d);
  return Math.acos(Math.max(-1, Math.min(1, c))) / d;
}

describe('planet-ephemeris.util', () => {
  const date = new Date('2026-10-24T22:00:00Z');
  const planets = planetPositions(date);

  it('places each naked-eye planet within 0.1° of JPL Horizons', () => {
    for (const p of planets) {
      const [ra, dec] = HORIZONS[p.name];
      expect(sepDeg(p.ra, p.dec, ra, dec), p.name).toBeLessThan(0.1);
    }
  });

  it('predicts visual magnitudes to within half a magnitude', () => {
    for (const p of planets) {
      expect(Math.abs(p.magnitude - HORIZONS[p.name][2]), p.name).toBeLessThan(0.5);
    }
  });

  it('returns unit vectors and plausible distances', () => {
    for (const p of planets) {
      expect(Math.hypot(p.unit.x, p.unit.y, p.unit.z)).toBeCloseTo(1, 9);
      expect(p.distance).toBeGreaterThan(0.2);
      expect(p.distance).toBeLessThan(11);
    }
  });
});
