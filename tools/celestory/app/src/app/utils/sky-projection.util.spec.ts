import { describe, expect, it } from 'vitest';
import { projectStereo, radiansPerPixel, stereographicParams, unprojectStereo } from './sky-projection.util';

describe('sky-projection.util', () => {
  const params = stereographicParams({ width: 1600, height: 900, fovDeg: 90 });

  it('puts the view axis at the screen centre', () => {
    const p = projectStereo({ cx: 0, cy: 0, cz: 1 }, params);
    expect(p?.x).toBeCloseTo(800, 6);
    expect(p?.y).toBeCloseTo(450, 6);
  });

  it('maps a direction half the FOV above the axis to the top edge', () => {
    const theta = (90 / 2) * (Math.PI / 180);
    const p = projectStereo({ cx: 0, cy: Math.sin(theta), cz: Math.cos(theta) }, params);
    expect(p?.x).toBeCloseTo(800, 6);
    expect(p?.y).toBeCloseTo(0, 6);
  });

  it('round-trips project → unproject across the field', () => {
    for (const [cx, cy] of [
      [0.3, 0.2],
      [-0.5, 0.1],
      [0.0, -0.7],
      [0.6, 0.6],
    ]) {
      const cz = Math.sqrt(1 - cx * cx - cy * cy);
      const s = projectStereo({ cx, cy, cz }, params);
      expect(s).not.toBeNull();
      const back = unprojectStereo(s!.x, s!.y, params);
      expect(back.cx).toBeCloseTo(cx, 9);
      expect(back.cy).toBeCloseTo(cy, 9);
      expect(back.cz).toBeCloseTo(cz, 9);
    }
  });

  it('unprojects to unit vectors everywhere on screen', () => {
    for (const [x, y] of [
      [0, 0],
      [1600, 900],
      [10, 450],
      [800, 890],
    ]) {
      const c = unprojectStereo(x, y, params);
      expect(Math.hypot(c.cx, c.cy, c.cz)).toBeCloseTo(1, 9);
    }
  });

  it('culls directions far behind the camera', () => {
    expect(projectStereo({ cx: 0, cy: 0, cz: -1 }, params)).toBeNull();
    expect(projectStereo({ cx: 0, cy: 0.1, cz: -0.9 }, params)).toBeNull();
  });

  it('reports the angular pan scale at the centre', () => {
    // At the centre, one plane unit is one radian to first order.
    expect(radiansPerPixel(params)).toBeCloseTo(1 / params.scale, 12);
  });
});
