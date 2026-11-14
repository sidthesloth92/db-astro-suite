import {
  makePhoto,
  PlantedFilament,
  PlantedStar,
  withFilament,
} from '../../testing/synthetic-photo.util';
import { RingProfile } from '../models/ring-profile.model';
import { StarSpread } from '../models/star-lift.model';
import { brightnessOf } from './star-detect.util';
import { measureStarSpread } from './star-spread.util';

const W = 300;
const H = 300;
const SKY = 0.05;
const MAX_RADIUS = 40;
const STAR: PlantedStar = { x: 150, y: 150, amp: 0.5, sigma: 2 };

/** A band of nebula through the middle of the test photo. */
function band(angle: number, amp: number, sigma: number): PlantedFilament {
  return { x: 150, y: 150, angle, amp, sigma };
}

/** Measures whatever sits at the middle of a test photo, as the detector would. */
function spreadAtCentre(photo: Uint8ClampedArray, peak: number): StarSpread {
  const rings = new RingProfile(brightnessOf(photo, W, H), W, H, MAX_RADIUS);
  rings.centreOn(150, 150);
  return measureStarSpread(rings, { peak, background: SKY, noise: 0.004 }, MAX_RADIUS);
}

describe('measureStarSpread', () => {
  const clearSky = makePhoto(W, H, [SKY, SKY, SKY], [STAR]);

  it('should end a star in clear sky where its light meets the background', () => {
    const spread = spreadAtCentre(clearSky, STAR.amp);

    expect(spread.rEnd).toBeGreaterThanOrEqual(5);
    expect(spread.rEnd).toBeLessThanOrEqual(7);
    expect(spread.rHalf).toBeGreaterThanOrEqual(2);
    expect(spread.rHalf).toBeLessThanOrEqual(3);
  });

  it('should end a star on a thin filament where the star ends, not where the filament does', () => {
    const onFilament = withFilament(clearSky, W, H, band(70, 0.35, 2));

    const clear = spreadAtCentre(clearSky, STAR.amp);
    const crossed = spreadAtCentre(onFilament, STAR.amp + 0.35);

    expect(Math.abs(crossed.rEnd - clear.rEnd)).toBeLessThanOrEqual(2);
  });

  it('should end a star on a wide glow where the glow levels off', () => {
    // The glow is far wider than the star, so near the star it is a level floor above the sky.
    const glow = { x: 150, y: 150, amp: 0.25, sigma: 90 };
    const onGlow = makePhoto(W, H, [SKY, SKY, SKY], [STAR, glow]);

    const clear = spreadAtCentre(clearSky, STAR.amp);
    const glowing = spreadAtCentre(onGlow, STAR.amp + 0.25);

    expect(glowing.rEnd).toBeLessThanOrEqual(clear.rEnd + 3);
  });

  it('should measure half-light from the star’s own height, not from the nebula under it', () => {
    const faintOnGlow = makePhoto(W, H, [SKY, SKY, SKY], [
      { ...STAR, amp: 0.3 },
      { x: 150, y: 150, amp: 0.3, sigma: 90 },
    ]);

    expect(spreadAtCentre(faintOnGlow, 0.6).rHalf).toBeLessThanOrEqual(3);
  });

  it('should score a star as round, with or without a filament passing behind it', () => {
    const onFilament = withFilament(clearSky, W, H, band(70, 0.1, 4));

    expect(spreadAtCentre(clearSky, STAR.amp).roundness).toBeGreaterThan(0.9);
    expect(spreadAtCentre(onFilament, STAR.amp + 0.1).roundness).toBeGreaterThan(0.7);
  });

  it('should score a bright spot on a filament as not round', () => {
    const sky = makePhoto(W, H, [SKY, SKY, SKY], [{ x: 150, y: 150, amp: 0.05, sigma: 3 }]);
    const spot = withFilament(sky, W, H, band(0, 0.35, 3));

    expect(spreadAtCentre(spot, 0.4).roundness).toBeLessThan(0.55);
  });

  it('should give a burnt-out core wider than the walk the benefit of the doubt', () => {
    const core = { x: 150, y: 150, amp: 40, sigma: 20 };
    const giant = makePhoto(W, H, [SKY, SKY, SKY], [core]);

    const spread = spreadAtCentre(giant, 1 - SKY);

    expect(spread.rEnd).toBe(MAX_RADIUS);
    expect(spread.roundness).toBe(1);
  });
});
