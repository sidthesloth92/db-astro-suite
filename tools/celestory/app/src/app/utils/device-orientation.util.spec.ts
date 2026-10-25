import { describe, expect, it } from 'vitest';
import { orientationToPointing } from './device-orientation.util';

describe('device-orientation.util', () => {
  it('points straight down when the phone lies flat, face up', () => {
    const p = orientationToPointing(0, 0, 0);
    expect(p.pitch).toBeCloseTo(-90, 6);
  });

  it('points at the horizon toward north when held upright facing north', () => {
    // Upright portrait: beta = 90°, screen toward the user who faces north → back axis north.
    const p = orientationToPointing(0, 90, 0);
    expect(p.pitch).toBeCloseTo(0, 6);
    expect(p.heading).toBeCloseTo(0, 6);
  });

  it('rotates the heading with alpha', () => {
    const p = orientationToPointing(90, 90, 0);
    expect(p.pitch).toBeCloseTo(0, 6);
    // alpha increases counter-clockwise seen from above, so the pointing turns west.
    expect(p.heading).toBeCloseTo(270, 6);
  });

  it('points at the zenith when the phone lies flat, face down', () => {
    const p = orientationToPointing(0, 180, 0);
    expect(p.pitch).toBeCloseTo(90, 6);
  });
});
