import { GIANT_STRIDE, PATCH_STRIDE, STAR_STRIDE } from '../constants/star-lift.constant';
import { makePhoto, pixelAt, withFilament } from '../../testing/synthetic-photo.util';
import { liftStars, measuredStarCount } from './star-lift.util';

const W = 260;
const H = 220;
const SKY: [number, number, number] = [0.05, 0.05, 0.06];
const STARS = [
  { x: 60, y: 50, amp: 0.6, sigma: 1.8 },
  { x: 190, y: 70, amp: 0.8, sigma: 2.2, color: [1, 0.7, 0.4] as [number, number, number] },
  { x: 120, y: 170, amp: 0.4, sigma: 1.5 },
];

describe('liftStars', () => {
  it('should lift each star into its own cut-out and measure it', () => {
    const scene = liftStars(makePhoto(W, H, SKY, STARS), W, H);
    expect(scene.patches.length / PATCH_STRIDE).toBe(3);
    expect(measuredStarCount(scene)).toBe(3);
    expect(scene.stars.length).toBe(3 * STAR_STRIDE);
  });

  it('should leave only sky where the stars were', () => {
    const scene = liftStars(makePhoto(W, H, SKY, STARS), W, H);
    for (const star of STARS) {
      const [r] = pixelAt(scene.starless, W, star.x, star.y);
      expect(Math.abs(r - Math.round(SKY[0] * 255))).toBeLessThanOrEqual(3);
    }
  });

  it('should rebuild the photo exactly when each cut-out is added back to the starless image', () => {
    const photo = makePhoto(W, H, SKY, STARS);
    const scene = liftStars(photo, W, H);

    for (let i = 0; i < scene.patches.length; i += PATCH_STRIDE) {
      const [cx, cy, hw, hh, ax, ay] = scene.patches.subarray(i, i + 6);
      const x0 = cx - hw;
      const y0 = cy - hh;
      // Check the centre row of the cut-out.
      const y = Math.floor(cy);
      for (let x = x0; x < x0 + hw * 2; x++) {
        const a = ((ay + y - y0) * scene.atlasWidth + ax + x - x0) * 4;
        if (scene.atlas[a + 3] === 0) continue; // pixel belongs to the backdrop
        const s = (y * W + x) * 4;
        expect(scene.atlas[a] + scene.starless[s]).toBe(photo[s]);
      }
    }
  });

  it('should keep the photo it was given, untouched, as the scene’s photo', () => {
    const photo = makePhoto(W, H, SKY, STARS);
    const before = new Uint8ClampedArray(photo);
    const scene = liftStars(photo, W, H);
    expect(scene.photo).toBe(photo);
    expect(Array.from(photo)).toEqual(Array.from(before));
  });

  it('should measure a star with a burnt-out core once, so the Sharp style draws it once', () => {
    const scene = liftStars(makePhoto(W, H, SKY, [{ x: 130, y: 110, amp: 1.8, sigma: 2.6 }]), W, H);
    expect(measuredStarCount(scene)).toBe(1);
  });

  it('should leave a nebula knot in the backdrop instead of lifting it', () => {
    const nebula: [number, number, number] = [0.1, 0.3, 0.12];
    const knot = { x: 130, y: 110, amp: 0.5, sigma: 3, color: [0.25, 1, 0.3] as [number, number, number] };
    const scene = liftStars(makePhoto(W, H, nebula, [knot]), W, H);
    expect(scene.patches.length).toBe(0);
    expect(pixelAt(scene.starless, W, 130, 110)).toEqual(pixelAt(scene.photo, W, 130, 110));
  });

  it('should leave a thin filament in the backdrop right up to a star lifted off it', () => {
    const size = 600;
    const star = { x: 300, y: 300, amp: 0.5, sigma: 2 };
    const sky = makePhoto(size, size, SKY, [star]);
    const photo = withFilament(sky, size, size, {
      x: 300,
      y: 300,
      angle: 90,
      amp: 0.35,
      sigma: 2,
      color: [1, 0.45, 0.15],
    });
    const scene = liftStars(photo, size, size);

    // The star itself is gone from the backdrop...
    const [atStar] = pixelAt(scene.starless, size, star.x, star.y);
    expect(atStar).toBeLessThan(pixelAt(photo, size, star.x, star.y)[0] - 60);
    // ...and a short way along the filament the backdrop is the photo, untouched.
    for (const y of [star.y - 16, star.y + 16]) {
      expect(pixelAt(scene.starless, size, star.x, y)).toEqual(pixelAt(photo, size, star.x, y));
    }
  });

  it('should keep a giant star with the backdrop and report it separately', () => {
    const scene = liftStars(makePhoto(W, H, SKY, [{ x: 130, y: 110, amp: 6, sigma: 6 }]), W, H);
    expect(scene.giants.length).toBe(GIANT_STRIDE);
    expect(scene.giants[0]).toBeCloseTo(130, 0);
    expect(pixelAt(scene.starless, W, 130, 110)).toEqual([255, 255, 255]);
  });

  it('should produce a depth value for every pixel', () => {
    const scene = liftStars(makePhoto(W, H, SKY, STARS), W, H);
    expect(scene.cloudDepth.length).toBe(W * H);
  });
});
