import { makePhoto, pixelAt } from '../../testing/synthetic-photo.util';
import { inpaintHoles } from './inpaint.util';

const W = 64;
const H = 48;

/** Owner map with a square hole of the given half-size around a centre. */
function holeAt(cx: number, cy: number, half: number): Int32Array {
  const owner = new Int32Array(W * H).fill(-1);
  for (let y = cy - half; y <= cy + half; y++) for (let x = cx - half; x <= cx + half; x++) owner[y * W + x] = 0;
  return owner;
}

describe('inpaintHoles', () => {
  it('should fill a hole in flat sky with the sky colour', () => {
    const pixels = makePhoto(W, H, [0.2, 0.4, 0.6]);
    // Paint the hole white so the test proves the fill ignores what was there.
    const owner = holeAt(30, 24, 4);
    for (let i = 0; i < W * H; i++) if (owner[i] === 0) pixels.set([255, 255, 255], i * 4);

    const out = inpaintHoles(pixels, owner, W, H);

    const [r, g, b] = pixelAt(out, W, 30, 24);
    expect(Math.abs(r - 51)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - 102)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - 153)).toBeLessThanOrEqual(1);
  });

  it('should never change a pixel outside the holes', () => {
    const pixels = makePhoto(W, H, [0.1, 0.1, 0.1], [{ x: 10, y: 10, amp: 0.7, sigma: 2 }]);
    const owner = holeAt(40, 30, 5);
    const out = inpaintHoles(pixels, owner, W, H);

    for (let i = 0; i < W * H; i++) {
      if (owner[i] !== -1) continue;
      expect(out[i * 4]).toBe(pixels[i * 4]);
      expect(out[i * 4 + 3]).toBe(255);
    }
  });

  it('should fill a hole on a gradient with values between its two sides', () => {
    const pixels = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pixels.set([x * 4, x * 4, x * 4, 255], (y * W + x) * 4);
    const out = inpaintHoles(pixels, holeAt(30, 24, 5), W, H);

    const filled = pixelAt(out, W, 30, 24)[0];
    expect(filled).toBeGreaterThan(pixelAt(pixels, W, 24, 24)[0]);
    expect(filled).toBeLessThan(pixelAt(pixels, W, 36, 24)[0]);
  });

  it('should fill even a hole that covers most of the image with the colour that is left', () => {
    const pixels = makePhoto(W, H, [0.2, 0.4, 0.6]);
    const owner = new Int32Array(W * H).fill(0);
    for (let x = 0; x < 3; x++) owner[x] = -1; // only three known pixels, in one corner
    const out = inpaintHoles(pixels, owner, W, H);

    const [r, g, b] = pixelAt(out, W, W - 1, H - 1);
    expect(Math.abs(r - 51)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - 102)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - 153)).toBeLessThanOrEqual(1);
  });

  it('should return a new image and leave the source as it was', () => {
    const pixels = makePhoto(W, H, [0.3, 0.3, 0.3]);
    const before = new Uint8ClampedArray(pixels);
    const out = inpaintHoles(pixels, holeAt(20, 20, 3), W, H);
    expect(out).not.toBe(pixels);
    expect(Array.from(pixels)).toEqual(Array.from(before));
  });
});
