import { LuminanceImage } from '../models/detection.types';
import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { estimateBackground } from './background.util';
import { renderSyntheticField } from './star-field-fixture.util';

/**
 * Converts an RGBA fixture buffer to a Rec.709 luminance plane. Local to the
 * spec so it does not depend on the production luminance util.
 */
function luminanceFromRgba(rgba: Uint8ClampedArray, width: number, height: number): LuminanceImage {
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    const p = i * 4;
    data[i] = 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
  }
  return { data, width, height };
}

/** Renders a synthetic field and converts it straight to a luminance plane. */
function syntheticLuminance(
  width: number,
  height: number,
  stars: readonly SyntheticStar[],
  background: SyntheticBackground,
  noiseSigma: number,
  seed: number,
): LuminanceImage {
  const rgba = renderSyntheticField(width, height, stars, background, noiseSigma, seed);
  return luminanceFromRgba(rgba, width, height);
}

describe('background.util', () => {
  describe('estimateBackground', () => {
    it('should recover a flat background everywhere with near-zero sigma', () => {
      const width = 64;
      const height = 64;
      const base = 50;
      const lum = syntheticLuminance(width, height, [], { base, gradientX: 0, gradientY: 0 }, 0, 1);

      const { background, sigma } = estimateBackground(lum, 16);

      expect(background.length).toBe(width * height);
      for (let i = 0; i < background.length; i++) {
        expect(background[i]).toBeCloseTo(base, 3);
      }
      expect(sigma).toBeCloseTo(0, 3);
    });

    it('should recover a pure linear gradient at interior probe points', () => {
      const width = 96;
      const height = 96;
      const field: SyntheticBackground = { base: 20, gradientX: 0.3, gradientY: 0.2 };
      const lum = syntheticLuminance(width, height, [], field, 0, 1);

      const { background } = estimateBackground(lum, 16);

      // Probe points sit between the first and last tile centers (7.5..87.5)
      // where bilinear interpolation is not edge-clamped. Tolerance covers
      // the fixture's 8-bit quantization of the ramp.
      const probes: ReadonlyArray<{ x: number; y: number }> = [
        { x: 24, y: 24 },
        { x: 48, y: 40 },
        { x: 70, y: 60 },
        { x: 30, y: 65 },
      ];
      for (const p of probes) {
        const expected = field.base + field.gradientX * p.x + field.gradientY * p.y;
        expect(Math.abs(background[p.y * width + p.x] - expected)).toBeLessThan(1);
      }
    });

    it('should not let a single bright star lift the background beneath it', () => {
      const width = 64;
      const height = 64;
      const base = 30;
      const amplitude = 200;
      const star: SyntheticStar = { x: 24, y: 24, amplitude, sigma: 2 };
      const lum = syntheticLuminance(
        width,
        height,
        [star],
        { base, gradientX: 0, gradientY: 0 },
        0,
        1,
      );

      const { background } = estimateBackground(lum, 16);

      // Median robustness: the level under the star must stay within a small
      // fraction of the star amplitude above the true background.
      const underStar = background[star.y * width + star.x];
      expect(underStar - base).toBeLessThan(0.05 * amplitude);
      // A pixel far from the star stays at the flat level.
      expect(background[8 * width + 56]).toBeCloseTo(base, 1);
    });

    it('should estimate the noise sigma within 25% via the MAD', () => {
      const width = 128;
      const height = 128;
      const noiseSigma = 8;
      const lum = syntheticLuminance(
        width,
        height,
        [],
        { base: 120, gradientX: 0, gradientY: 0 },
        noiseSigma,
        42,
      );

      const { sigma } = estimateBackground(lum, 32);

      expect(sigma).toBeGreaterThan(noiseSigma * 0.75);
      expect(sigma).toBeLessThan(noiseSigma * 1.25);
    });
  });
});
