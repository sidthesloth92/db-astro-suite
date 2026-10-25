import { describe, expect, it } from 'vitest';
import { blackbodyLinearRgb, buildStarColorLut, bvToTemperature } from './star-color.util';

describe('star-color.util', () => {
  it('maps B−V to plausible temperatures', () => {
    expect(bvToTemperature(0.0)).toBeGreaterThan(9000); // Vega-like
    expect(bvToTemperature(0.0)).toBeLessThan(10500);
    expect(bvToTemperature(0.65)).toBeGreaterThan(5500); // Sun-like
    expect(bvToTemperature(0.65)).toBeLessThan(6100);
    expect(bvToTemperature(1.85)).toBeLessThan(3800); // Betelgeuse-like
  });

  it('makes hot stars bluish and cool stars reddish at equal luminance', () => {
    const hot = blackbodyLinearRgb(12000);
    const cool = blackbodyLinearRgb(3500);
    expect(hot[2]).toBeGreaterThan(hot[0]);
    expect(cool[0]).toBeGreaterThan(cool[2]);
    for (const c of [hot, cool]) {
      const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      expect(lum).toBeCloseTo(1, 6);
    }
  });

  it('renders a ~5800 K star close to white', () => {
    const sun = blackbodyLinearRgb(5800);
    expect(Math.abs(sun[0] - sun[2])).toBeLessThan(0.35);
  });

  it('builds a LUT of the requested width with finite, non-negative values', () => {
    const lut = buildStarColorLut(64);
    expect(lut.length).toBe(192);
    for (const v of lut) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});
