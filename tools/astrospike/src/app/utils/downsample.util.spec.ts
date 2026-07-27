import { LuminanceImage } from '../models/detection.types';
import { downsampleLuminance } from './downsample.util';

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
});
