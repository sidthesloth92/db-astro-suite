import { LuminanceImage } from '../models/detection.types';
import {
  downsampleFactorFor,
  downsampleLuminance,
  downsampleLuminanceFromRgba,
} from './downsample.util';
import { toLuminance } from './luminance.util';

/** Builds a deterministic RGBA buffer for the fused-path tests. */
const makeRgba = (width: number, height: number): Uint8ClampedArray => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = (i * 7) % 256;
    rgba[i * 4 + 1] = (i * 13 + 40) % 256;
    rgba[i * 4 + 2] = (i * 29 + 90) % 256;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
};

/** Builds a LuminanceImage from a plain number array for test input. */
const makePlane = (values: readonly number[], width: number, height: number): LuminanceImage => ({
  data: Float32Array.from(values),
  width,
  height,
});

describe('downsample.util', () => {
  describe('downsampleLuminance', () => {
    it('should box-average a 4x4 plane into exact 2x2 block means', () => {
      // Values 0..15 row-major; factor = ceil(4 / 2) = 2.
      const src = makePlane(Array.from({ length: 16 }, (_, i) => i), 4, 4);
      const result = downsampleLuminance(src, 2);

      expect(result.factor).toBe(2);
      expect(result.image.width).toBe(2);
      expect(result.image.height).toBe(2);
      // Block means: (0+1+4+5)/4, (2+3+6+7)/4, (8+9+12+13)/4, (10+11+14+15)/4.
      expect(Array.from(result.image.data)).toEqual([2.5, 4.5, 10.5, 12.5]);
    });

    it('should average non-divisible edge blocks over the actual pixel count', () => {
      // 3x3 with values 0..8, maxDimension 2 => factor 2, output 2x2.
      const src = makePlane(Array.from({ length: 9 }, (_, i) => i), 3, 3);
      const result = downsampleLuminance(src, 2);

      expect(result.factor).toBe(2);
      expect(result.image.width).toBe(2);
      expect(result.image.height).toBe(2);
      expect(Array.from(result.image.data)).toEqual([
        (0 + 1 + 3 + 4) / 4, // full 2x2 block
        (2 + 5) / 2, // right edge: 1x2 block
        (6 + 7) / 2, // bottom edge: 2x1 block
        8, // corner: single pixel
      ]);
    });

    it('should return the same LuminanceImage object when the factor is 1', () => {
      const src = makePlane([1, 2, 3, 4], 2, 2);
      const result = downsampleLuminance(src, 2);

      expect(result.factor).toBe(1);
      expect(result.image).toBe(src);
    });

    const factorCases: ReadonlyArray<{
      name: string;
      width: number;
      height: number;
      maxDimension: number;
      expected: number;
    }> = [
      { name: 'exact multiple of the limit', width: 4000, height: 3000, maxDimension: 1000, expected: 4 },
      { name: 'non-multiple rounded up', width: 1500, height: 1000, maxDimension: 1000, expected: 2 },
      { name: 'just over the limit', width: 1001, height: 800, maxDimension: 1000, expected: 2 },
      { name: 'exactly at the limit', width: 1000, height: 999, maxDimension: 1000, expected: 1 },
      { name: 'below the limit', width: 640, height: 480, maxDimension: 1000, expected: 1 },
      { name: 'driven by height when taller than wide', width: 500, height: 2500, maxDimension: 1000, expected: 3 },
    ];

    for (const c of factorCases) {
      it(`should compute factor = ceil(max(w, h) / maxDimension): ${c.name}`, () => {
        const src = makePlane(new Array<number>(c.width * c.height).fill(0), c.width, c.height);
        expect(downsampleLuminance(src, c.maxDimension).factor).toBe(c.expected);
      });
    }

    it('should preserve a uniform plane value through box averaging', () => {
      const src = makePlane(new Array<number>(25).fill(7), 5, 5);
      const result = downsampleLuminance(src, 2);

      expect(result.factor).toBe(3);
      expect(result.image.width).toBe(2);
      expect(result.image.height).toBe(2);
      for (const value of result.image.data) {
        expect(value).toBe(7);
      }
    });
  });

  describe('downsampleFactorFor', () => {
    it('should never return a factor below 1 for images smaller than the limit', () => {
      expect(downsampleFactorFor(100, 80, 1536)).toBe(1);
    });

    it('should round up to cover the larger dimension', () => {
      expect(downsampleFactorFor(4000, 3000, 1000)).toBe(4);
      expect(downsampleFactorFor(500, 2500, 1000)).toBe(3);
    });
  });

  describe('downsampleLuminanceFromRgba', () => {
    const equivalenceCases: ReadonlyArray<{
      name: string;
      width: number;
      height: number;
      maxDimension: number;
    }> = [
      { name: 'exact multiple', width: 16, height: 8, maxDimension: 4 },
      { name: 'non-divisible edge blocks', width: 15, height: 7, maxDimension: 4 },
      { name: 'no downsampling required', width: 6, height: 5, maxDimension: 32 },
      { name: 'height-driven factor', width: 5, height: 20, maxDimension: 6 },
    ];

    for (const c of equivalenceCases) {
      it(`should match toLuminance + downsampleLuminance exactly: ${c.name}`, () => {
        const rgba = makeRgba(c.width, c.height);
        const fused = downsampleLuminanceFromRgba(rgba, c.width, c.height, c.maxDimension);
        const twoStep = downsampleLuminance(
          toLuminance(rgba, c.width, c.height),
          c.maxDimension,
        );

        expect(fused.factor).toBe(twoStep.factor);
        expect(fused.image.width).toBe(twoStep.image.width);
        expect(fused.image.height).toBe(twoStep.image.height);
        fused.image.data.forEach((value, i) => {
          expect(value).toBeCloseTo(twoStep.image.data[i], 3);
        });
      });
    }

    it('should allocate only the downsampled plane, never a full-resolution one', () => {
      // Regression guard for peak memory on 60+ megapixel frames: the output
      // must be sized by the downsampled dimensions, not the source ones.
      const width = 800;
      const height = 600;
      const result = downsampleLuminanceFromRgba(makeRgba(width, height), width, height, 100);

      expect(result.factor).toBe(8);
      expect(result.image.data.length).toBe(100 * 75);
      expect(result.image.data.length).toBeLessThan(width * height);
    });
  });
});
