import { BackgroundMap, LuminanceImage } from '../models/detection.types';
import { thresholdMask } from './threshold.util';

/** Wraps raw values in a 1-row LuminanceImage. */
function lumOf(values: readonly number[]): LuminanceImage {
  return { data: Float32Array.from(values), width: values.length, height: 1 };
}

/** Builds a BackgroundMap with a uniform background level. */
function flatBackground(level: number, length: number, sigma: number): BackgroundMap {
  return { background: new Float32Array(length).fill(level), sigma };
}

describe('threshold.util', () => {
  describe('thresholdMask', () => {
    // Background 10, sigma 2, k = 2 → mask requires lum - 10 > 4.
    const cases: ReadonlyArray<{ name: string; value: number; expected: number }> = [
      { name: 'marks 0 at the background level', value: 10, expected: 0 },
      { name: 'marks 0 below the background', value: 8, expected: 0 },
      { name: 'marks 0 just below the threshold', value: 13.9, expected: 0 },
      { name: 'marks 0 exactly at the threshold (exclusive)', value: 14, expected: 0 },
      { name: 'marks 1 just above the threshold', value: 14.1, expected: 1 },
      { name: 'marks 1 far above the threshold', value: 100, expected: 1 },
    ];

    for (const c of cases) {
      it(`should ${c.name}`, () => {
        const lum = lumOf([c.value]);
        const mask = thresholdMask(lum, flatBackground(10, 1, 2), 2);
        expect(mask[0]).toBe(c.expected);
      });
    }

    it('should evaluate each pixel against its own background value', () => {
      const lum = lumOf([20, 20, 20, 20]);
      const bg: BackgroundMap = {
        background: Float32Array.from([5, 14, 16, 20]),
        sigma: 2,
      };
      // Threshold is bg[i] + 4: diffs are 15, 6, 4, 0 → 1, 1, 0, 0.
      expect(Array.from(thresholdMask(lum, bg, 2))).toEqual([1, 1, 0, 0]);
    });

    it('should require strictly positive residuals when sigma is zero', () => {
      const lum = lumOf([10, 10.5, 9.5]);
      const mask = thresholdMask(lum, flatBackground(10, 3, 0), 2);
      expect(Array.from(mask)).toEqual([0, 1, 0]);
    });

    it('should return a mask with one entry per pixel', () => {
      const lum: LuminanceImage = { data: new Float32Array(12), width: 4, height: 3 };
      const mask = thresholdMask(lum, flatBackground(0, 12, 1), 3);
      expect(mask.length).toBe(12);
      expect(mask).toBeInstanceOf(Uint8Array);
    });
  });
});
