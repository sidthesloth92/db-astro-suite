import { makePhoto } from '../../testing/synthetic-photo.util';
import { estimateLocalBackground, upsampleBilinear } from './local-background.util';
import { brightnessOf } from './star-detect.util';

describe('estimateLocalBackground', () => {
  it('should report the level of a flat image with almost no noise', () => {
    const lum = new Float32Array(96 * 96).fill(0.25);
    const { background, sigma } = estimateLocalBackground(lum, 96, 96, 32);
    expect(background[50 * 96 + 50]).toBeCloseTo(0.25, 4);
    expect(sigma[50 * 96 + 50]).toBeLessThan(0.001);
  });

  it('should not be pulled up by a star inside the block', () => {
    const pixels = makePhoto(96, 96, [0.1, 0.1, 0.1], [{ x: 48, y: 48, amp: 0.9, sigma: 2 }]);
    const lum = brightnessOf(pixels, 96, 96);
    const { background } = estimateLocalBackground(lum, 96, 96, 32);
    expect(background[48 * 96 + 48]).toBeCloseTo(0.1, 1);
  });

  it('should follow a background that differs across the frame', () => {
    const lum = new Float32Array(128 * 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) lum[y * 128 + x] = x < 64 ? 0.1 : 0.5;
    const { background } = estimateLocalBackground(lum, 128, 64, 32);
    expect(background[32 * 128 + 10]).toBeCloseTo(0.1, 2);
    expect(background[32 * 128 + 118]).toBeCloseTo(0.5, 2);
  });
});

describe('upsampleBilinear', () => {
  it('should keep a constant image constant', () => {
    const out = upsampleBilinear(new Float32Array(4).fill(0.7), 2, 2, 9, 7);
    for (const v of out) expect(v).toBeCloseTo(0.7, 5);
  });

  it('should blend smoothly between two cells', () => {
    const out = upsampleBilinear(new Float32Array([0, 1]), 2, 1, 8, 1);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[7]).toBeCloseTo(1, 5);
    for (let x = 1; x < 8; x++) expect(out[x]).toBeGreaterThanOrEqual(out[x - 1]);
  });
});
