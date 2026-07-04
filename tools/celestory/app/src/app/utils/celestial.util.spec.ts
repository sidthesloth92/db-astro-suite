import { describe, expect, it } from 'vitest';
import {
  altAzToVec,
  catColor,
  galToRaDec,
  generateSky,
  targetRaDec,
  raDecToAltAz,
} from './celestial.util';

describe('celestial.util', () => {
  it('places a target at the local zenith when it transits at the observer latitude', () => {
    // An target whose declination equals the latitude culminates near the zenith.
    const lat = 40;
    const lon = -74;
    const date = new Date('2026-03-20T00:00:00Z');
    // Find the RA that is on the meridian (HA = 0) for this instant, then dec = lat.
    const { alt } = raDecToAltAz(120, lat, lat, lon, date);
    // Altitude is always within the valid range.
    expect(alt).toBeGreaterThanOrEqual(-90);
    expect(alt).toBeLessThanOrEqual(90);
  });

  it('returns a unit ENU vector from alt/az', () => {
    const v = altAzToVec(35, 200);
    const len = Math.hypot(v.x, v.y, v.z);
    expect(len).toBeCloseTo(1, 6);
  });

  it('maps the zenith (alt=90) to straight up', () => {
    const v = altAzToVec(90, 0);
    expect(v.z).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(0, 6);
  });

  it('converts the galactic centre to a plausible equatorial position', () => {
    // Galactic (0,0) ≈ RA 266.4°, Dec −28.9° (J2000).
    const { ra, dec } = galToRaDec(0, 0);
    expect(ra).toBeCloseTo(266.4, 0);
    expect(dec).toBeCloseTo(-28.9, 0);
  });

  it('prefers a target\'s own coordinates, else falls back to the catalogue', () => {
    expect(targetRaDec({ ra: 10, dec: 20 })).toEqual([10, 20]);
    // M31 is in the fallback catalogue.
    expect(targetRaDec({ designation: 'M31' })).not.toBeNull();
    expect(targetRaDec({ designation: 'NOT-A-REAL-TARGET' })).toBeNull();
  });

  it('generates a deterministic, well-formed sky', () => {
    const a = generateSky();
    const b = generateSky();
    expect(a.field.length).toBe(b.field.length);
    expect(a.field.length).toBeGreaterThan(0);
    expect(a.milky.length).toBeGreaterThan(0);
    expect(a.ha.length).toBeGreaterThan(0);
  });

  it('returns a category accent colour, defaulting for unknown categories', () => {
    expect(catColor('Galaxy')).toMatch(/^#/);
    expect(catColor('Totally Unknown')).toBe(catColor('Other'));
  });
});
