import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { mulberry32, renderSyntheticField } from './star-field-fixture.util';

/** Reads the RGBA quadruple at (x, y) from a rendered field. */
function pixelAt(
  buffer: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]];
}

const FLAT_BACKGROUND: SyntheticBackground = { base: 10, gradientX: 0, gradientY: 0 };

describe('mulberry32', () => {
  it('should produce the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('should produce different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('should produce values in the [0, 1) range', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('renderSyntheticField', () => {
  it('should render identical buffers for the same seed', () => {
    const stars: SyntheticStar[] = [{ x: 8, y: 8, amplitude: 180, sigma: 1.5 }];
    const a = renderSyntheticField(16, 16, stars, FLAT_BACKGROUND, 3, 123);
    const b = renderSyntheticField(16, 16, stars, FLAT_BACKGROUND, 3, 123);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('should render different noise for a different seed', () => {
    const a = renderSyntheticField(16, 16, [], FLAT_BACKGROUND, 5, 1);
    const b = renderSyntheticField(16, 16, [], FLAT_BACKGROUND, 5, 2);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('should place the star peak at the expected pixel', () => {
    const width = 33;
    const height = 33;
    const stars: SyntheticStar[] = [{ x: 16, y: 16, amplitude: 200, sigma: 2 }];
    const buffer = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 9);

    const [peakR] = pixelAt(buffer, width, 16, 16);
    // base 10 + amplitude 200 at the exact center.
    expect(peakR).toBe(210);

    // Every other pixel is strictly dimmer than the star center.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 16 && y === 16) {
          continue;
        }
        const [r] = pixelAt(buffer, width, x, y);
        expect(r).toBeLessThan(peakR);
      }
    }
  });

  it('should rise across the image when a gradient is set', () => {
    const width = 32;
    const background: SyntheticBackground = { base: 10, gradientX: 2, gradientY: 0 };
    const buffer = renderSyntheticField(width, 4, [], background, 0, 5);

    const [left] = pixelAt(buffer, width, 0, 1);
    const [middle] = pixelAt(buffer, width, 15, 1);
    const [right] = pixelAt(buffer, width, 31, 1);
    expect(left).toBe(10);
    expect(middle).toBe(40);
    expect(right).toBe(72);
    expect(middle).toBeGreaterThan(left);
    expect(right).toBeGreaterThan(middle);
  });

  it('should reflect a star color tint in the channel values', () => {
    const width = 17;
    const stars: SyntheticStar[] = [
      { x: 8, y: 8, amplitude: 200, sigma: 2, color: { r: 255, g: 128, b: 0 } },
    ];
    const buffer = renderSyntheticField(width, 17, stars, FLAT_BACKGROUND, 0, 3);

    const [r, g, b] = pixelAt(buffer, width, 8, 8);
    // Channel = base + amplitude * (color / 255) at the star center.
    expect(r).toBe(210);
    expect(g).toBe(Math.round(10 + 200 * (128 / 255)));
    expect(b).toBe(10);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('should clamp values to the 0-255 range and fill alpha with 255', () => {
    const width = 9;
    const stars: SyntheticStar[] = [{ x: 4, y: 4, amplitude: 5000, sigma: 2 }];
    const buffer = renderSyntheticField(width, 9, stars, FLAT_BACKGROUND, 0, 11);

    for (let i = 0; i < buffer.length; i += 4) {
      expect(buffer[i]).toBeLessThanOrEqual(255);
      expect(buffer[i]).toBeGreaterThanOrEqual(0);
      expect(buffer[i + 3]).toBe(255);
    }
    const [saturated] = pixelAt(buffer, width, 4, 4);
    expect(saturated).toBe(255);
  });
});
