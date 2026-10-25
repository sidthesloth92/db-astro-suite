import { describe, expect, it } from 'vitest';
import { camBasis } from './celestial.util';
import { buildSkyFrameInput, limitMagForFov } from './sky-frame-input.util';

describe('sky-frame-input.util', () => {
  it('interpolates the limiting magnitude monotonically with zoom', () => {
    expect(limitMagForFov(200)).toBeCloseTo(6.3, 6);
    expect(limitMagForFov(0.5)).toBeCloseTo(11.5, 6);
    let prev = limitMagForFov(150);
    for (let f = 140; f >= 1; f -= 7) {
      const m = limitMagForFov(f);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
    expect(limitMagForFov(75)).toBeGreaterThan(6.8);
    expect(limitMagForFov(75)).toBeLessThan(7.6);
  });

  it('puts the sun below the horizon at local midnight and above at noon', () => {
    const view = { width: 100, height: 100, fovDeg: 90 };
    const loc = { lat: 40, lon: -74, label: null, status: 'manual' as const };
    const midnight = buildSkyFrameInput(view, 1, camBasis(0, 0), loc, new Date('2026-10-25T04:56:00Z'), 0, 0.3);
    const noon = buildSkyFrameInput(view, 1, camBasis(0, 0), loc, new Date('2026-10-24T16:56:00Z'), 0, 0.3);
    expect(midnight.sunEnu.z).toBeLessThan(-0.5);
    expect(noon.sunEnu.z).toBeGreaterThan(0.5);
    expect(Math.hypot(noon.moonEnu.x, noon.moonEnu.y, noon.moonEnu.z)).toBeCloseTo(1, 6);
    expect(noon.moonIlluminated).toBeGreaterThanOrEqual(0);
    expect(noon.moonIlluminated).toBeLessThanOrEqual(1);
  });
});
