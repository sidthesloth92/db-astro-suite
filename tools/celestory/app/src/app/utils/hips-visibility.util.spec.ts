import { describe, expect, it } from 'vitest';
import { cellCenter, vecToNest } from './healpix.util';
import { cellRadiusRad, orderForPixelScale, visibleCells } from './hips-visibility.util';
import { raDecToUnit } from './sky-frame.util';

describe('hips-visibility.util', () => {
  it('picks deeper orders as the view zooms in, clamped to the survey range', () => {
    expect(orderForPixelScale(1)).toBe(3);
    expect(orderForPixelScale(0.05)).toBeGreaterThanOrEqual(3);
    const wide = orderForPixelScale(0.05);
    const narrow = orderForPixelScale(0.002);
    expect(narrow).toBeGreaterThan(wide);
    expect(orderForPixelScale(0.00001)).toBe(9);
  });

  it('always includes the cell under the view axis', () => {
    for (const order of [3, 5, 7]) {
      const axis = raDecToUnit(83.8, -5.4);
      const cells = visibleCells(order, axis, (10 * Math.PI) / 180);
      expect(cells).toContain(vecToNest(order, axis));
      // Every returned cell centre lies within the padded cone.
      for (const p of cells) {
        const c = cellCenter(order, p);
        const d = Math.acos(Math.max(-1, Math.min(1, c.x * axis.x + c.y * axis.y + c.z * axis.z)));
        expect(d).toBeLessThanOrEqual((10 * Math.PI) / 180 + cellRadiusRad(order) + 1e-9);
      }
    }
  });

  it('returns a bounded, zoom-dependent number of cells', () => {
    const axis = raDecToUnit(200, 40);
    const few = visibleCells(6, axis, (2 * Math.PI) / 180);
    const many = visibleCells(6, axis, (12 * Math.PI) / 180);
    expect(few.length).toBeGreaterThan(0);
    expect(few.length).toBeLessThan(40);
    expect(many.length).toBeGreaterThan(few.length);
  });
});
