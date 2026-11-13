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

  it('should leave the patch index unassigned until ownership is built', () => {
    const lum = brightnessOf(makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 120, y: 100, amp: 0.6, sigma: 2 }]), W, H);
    expect(detectLiftStars(lum, W, H)[0].group).toBe(-1);
  });
});
