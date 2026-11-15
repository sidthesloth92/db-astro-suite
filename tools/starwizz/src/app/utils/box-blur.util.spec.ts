import { blurImage } from './box-blur.util';

describe('blurImage', () => {
  it('should leave a flat image flat', () => {
    const flat = new Float32Array(20 * 15).fill(0.4);
    const out = blurImage(flat, 20, 15, 3);
    for (const v of out) expect(v).toBeCloseTo(0.4, 5);
  });

  it('should spread a single bright pixel without changing the total light', () => {
    const src = new Float32Array(41 * 41);
    src[20 * 41 + 20] = 1;
    const out = blurImage(src, 41, 41, 2);

    expect(out[20 * 41 + 20]).toBeLessThan(0.2);
    expect(out[20 * 41 + 23]).toBeGreaterThan(0);
    const total = out.reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(1, 4);
  });

  it('should return an untouched copy when the radius is zero', () => {
    const src = new Float32Array([0.1, 0.9, 0.3, 0.5]);
    const out = blurImage(src, 2, 2, 0);
    expect(out).not.toBe(src);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it('should not modify the source image', () => {
    const src = new Float32Array(9 * 9);
    src[40] = 1;
    blurImage(src, 9, 9, 1);
    expect(src[40]).toBe(1);
    expect(src[41]).toBe(0);
  });
});
