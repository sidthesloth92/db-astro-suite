import { describe, expect, it } from 'vitest';
import { twilightGlow, zenithLuminance } from './sky-scatter.util';

describe('sky-scatter.util', () => {
  it('is calibrated to a few thousand cd/m² at a high noon sun', () => {
    const l = zenithLuminance(50);
    expect(l).toBeGreaterThan(2000);
    expect(l).toBeLessThan(4500);
  });

  it('matches real twilight sky brightness to within an order of magnitude', () => {
    // Civil twilight end (−6°) ≈ 3 cd/m²; astronomical end (−18°) < 0.01.
    const civil = zenithLuminance(-6);
    expect(civil).toBeGreaterThan(1);
    expect(civil).toBeLessThan(10);
    expect(zenithLuminance(-18)).toBeLessThan(0.01);
  });

  it('decreases monotonically as the sun sets', () => {
    let prev = zenithLuminance(60);
    for (let a = 55; a >= -20; a -= 5) {
      const l = zenithLuminance(a);
      expect(l).toBeLessThanOrEqual(prev + 1e-9);
      prev = l;
    }
  });

  it('has no residual glow in daylight and none by astronomical night', () => {
    expect(twilightGlow(5)).toBe(0);
    expect(twilightGlow(-8)).toBeGreaterThan(0);
    expect(twilightGlow(-25)).toBeLessThan(1e-3);
  });
});
