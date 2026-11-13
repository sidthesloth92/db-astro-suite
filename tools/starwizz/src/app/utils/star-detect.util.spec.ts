import { makePhoto } from '../../testing/synthetic-photo.util';
import { backgroundBlockFor, brightnessOf, detectLiftStars } from './star-detect.util';

const W = 240;
const H = 200;

describe('brightnessOf', () => {
  it('should use the brightest channel so coloured stars count as bright', () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255, 10, 128, 20, 255]);
    const lum = brightnessOf(pixels, 2, 1);
    expect(lum[0]).toBeCloseTo(1, 5);
    expect(lum[1]).toBeCloseTo(128 / 255, 5);
  });
});

describe('backgroundBlockFor', () => {
  it('should scale with the image and stay within its limits', () => {
    expect(backgroundBlockFor(1440, 2560)).toBe(48);
    expect(backgroundBlockFor(200, 200)).toBe(32);
    expect(backgroundBlockFor(8000, 8000)).toBe(96);
  });
});

describe('detectLiftStars', () => {
  it('should find every planted star at its position, brightest first', () => {
    const planted = [
      { x: 60, y: 50, amp: 0.5, sigma: 1.6 },
      { x: 170, y: 120, amp: 0.85, sigma: 2 },
      { x: 110, y: 160, amp: 0.3, sigma: 1.4 },
    ];
    const stars = detectLiftStars(brightnessOf(makePhoto(W, H, [0.05, 0.05, 0.06], planted), W, H), W, H);

    expect(stars.length).toBe(3);
    expect(stars[0].peak).toBeGreaterThan(stars[1].peak);
    expect(stars[1].peak).toBeGreaterThan(stars[2].peak);
    for (const p of planted) {
      const hit = stars.find((s) => Math.abs(s.x - p.x) <= 1 && Math.abs(s.y - p.y) <= 1);
      expect(hit).withContext(`star at ${p.x},${p.y}`).toBeDefined();
    }
  });

  it('should find nothing on empty sky', () => {
    const stars = detectLiftStars(brightnessOf(makePhoto(W, H, [0.08, 0.08, 0.08]), W, H), W, H);
    expect(stars.length).toBe(0);
  });

  it('should give a wider, brighter star a larger disc than a small faint one', () => {
    const lum = brightnessOf(
      makePhoto(W, H, [0.05, 0.05, 0.05], [
        { x: 70, y: 100, amp: 0.9, sigma: 4 },
        { x: 170, y: 100, amp: 0.3, sigma: 1.2 },
      ]),
      W,
      H,
    );
    const [big, small] = detectLiftStars(lum, W, H);
    expect(big.rHalo).toBeGreaterThan(small.rHalo);
    expect(big.rHalf).toBeGreaterThan(small.rHalf);
  });

  it('should treat a wide, faint blob as nebula and not lift it', () => {
    const lum = brightnessOf(makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 120, y: 100, amp: 0.25, sigma: 9 }]), W, H);
    expect(detectLiftStars(lum, W, H).length).toBe(0);
  });

  it('should find a star with a burnt-out core once, not once per saturated pixel', () => {
    // amp above 1 clips into a flat white core several pixels across.
    const lum = brightnessOf(makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 120, y: 100, amp: 1.8, sigma: 2.6 }]), W, H);
    const stars = detectLiftStars(lum, W, H);
    expect(stars.length).toBe(1);
    expect(Math.abs(stars[0].x - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(stars[0].y - 100)).toBeLessThanOrEqual(1);
  });

  it('should place a star with a wide burnt-out core at the middle of the core', () => {
    for (const offset of [0, 0.5]) {
      const photo = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 120 + offset, y: 100 + offset, amp: 6, sigma: 6 }]);
      const stars = detectLiftStars(brightnessOf(photo, W, H), W, H);
      expect(stars.length).withContext(`offset ${offset}`).toBe(1);
      expect(Math.abs(stars[0].x - 120)).withContext(`offset ${offset}`).toBeLessThanOrEqual(1);
      expect(Math.abs(stars[0].y - 100)).withContext(`offset ${offset}`).toBeLessThanOrEqual(1);
    }
  });

  it('should not take a level shoulder beside a brighter star for a star of its own', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05]);
    const fill = (x0: number, x1: number, y0: number, y1: number, value: number): void => {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) pixels.set([value, value, value, 255], (y * W + x) * 4);
      }
    };
    fill(118, 122, 98, 102, 230); // the star: a flat bright top
    fill(123, 130, 99, 101, 150); // a level ledge running out of it, lower than the star

    const stars = detectLiftStars(brightnessOf(pixels, W, H), W, H);
    expect(stars.length).toBe(1);
    expect(Math.abs(stars[0].x - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(stars[0].y - 100)).toBeLessThanOrEqual(1);
  });

  it('should find a star whose two brightest pixels tie exactly once', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05]);
    for (const x of [120, 121]) pixels.set([200, 200, 200, 255], (100 * W + x) * 4);
    for (const [x, y] of [[119, 100], [122, 100], [120, 99], [121, 99], [120, 101], [121, 101]]) {
      pixels.set([110, 110, 110, 255], (y * W + x) * 4);
    }
    expect(detectLiftStars(brightnessOf(pixels, W, H), W, H).length).toBe(1);
  });
});
