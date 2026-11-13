import { BackgroundMap, LuminanceImage, SourceComponent } from '../models/detection.types';
import { renderSyntheticField } from './star-field-fixture.util';
import { measureSource } from './star-measure.util';

/** Converts an RGBA buffer to a Rec.709 luminance plane for spec inputs. */
function toLuminancePlane(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): LuminanceImage {
  const data = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    data[i] = 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
  }
  return { data, width, height };
}

/** Builds a flat per-pixel background map at a constant level. */
function flatBackground(size: number, level: number, sigma: number): BackgroundMap {
  return { background: new Float32Array(size).fill(level), sigma };
}

/** Collects all pixels more than `cut` above background into one component. */
function componentAbove(lum: LuminanceImage, bg: BackgroundMap, cut: number): SourceComponent {
  const indices: number[] = [];
  for (let i = 0; i < lum.data.length; i++) {
    if (lum.data[i] - bg.background[i] > cut) {
      indices.push(i);
    }
  }
  return { pixels: Int32Array.from(indices), count: indices.length };
}

/** Builds a zero-background luminance plane with explicit pixel values. */
function planeWithPixels(
  width: number,
  height: number,
  pixels: ReadonlyArray<{ x: number; y: number; value: number }>,
): { lum: LuminanceImage; component: SourceComponent } {
  const data = new Float32Array(width * height);
  const indices: number[] = [];
  for (const p of pixels) {
    const idx = p.y * width + p.x;
    data[idx] = p.value;
    indices.push(idx);
  }
  return {
    lum: { data, width, height },
    component: { pixels: Int32Array.from(indices), count: indices.length },
  };
}

describe('star-measure.util', () => {
  describe('measureSource', () => {
    it('should recover a symmetric Gaussian star as a round source at its injected center', () => {
      const width = 48;
      const height = 40;
      const starX = 20.3;
      const starY = 17.7;
      const amplitude = 180;
      const base = 20;
      const rgba = renderSyntheticField(
        width,
        height,
        [{ x: starX, y: starY, amplitude, sigma: 2 }],
        { base, gradientX: 0, gradientY: 0 },
        0,
        42,
      );
      const lum = toLuminancePlane(rgba, width, height);
      const bg = flatBackground(width * height, base, 1);
      const component = componentAbove(lum, bg, 10);

      const m = measureSource(component, lum, bg, 8);

      expect(Math.abs(m.cx - starX)).toBeLessThan(0.2);
      expect(Math.abs(m.cy - starY)).toBeLessThan(0.2);
      expect(m.elongation).toBeGreaterThanOrEqual(1);
      expect(m.elongation).toBeLessThan(1.15);
      expect(m.area).toBe(component.count);
      // Peak is near the injected amplitude (center falls between pixels).
      expect(m.peak).toBeGreaterThan(150);
      expect(m.peak).toBeLessThanOrEqual(amplitude);
      // Flux integrates the whole profile, so the peak is a small fraction.
      expect(m.flux).toBeGreaterThan(m.peak);
      expect(m.peak / m.flux).toBeLessThan(0.1);
    });

    it('should report a clearly elongated shape for a 3x1 line of pixels', () => {
      const { lum, component } = planeWithPixels(7, 5, [
        { x: 2, y: 2, value: 100 },
        { x: 3, y: 2, value: 100 },
        { x: 4, y: 2, value: 100 },
      ]);
      const bg = flatBackground(lum.data.length, 0, 1);

      const m = measureSource(component, lum, bg, 8);

      expect(m.cx).toBeCloseTo(3, 6);
      expect(m.cy).toBeCloseTo(2, 6);
      expect(m.elongation).toBeGreaterThan(1.8);
    });

    it('should report high concentration for a point source and low for a spread line', () => {
      // Compact star: all flux within the concentration disc.
      const compact = planeWithPixels(24, 24, [
        { x: 12, y: 12, value: 200 },
        { x: 13, y: 12, value: 120 },
        { x: 12, y: 13, value: 120 },
      ]);
      const compactBg = flatBackground(compact.lum.data.length, 0, 1);
      const compactM = measureSource(compact.component, compact.lum, compactBg, 4);
      expect(compactM.concentration).toBeCloseTo(1, 6);

      // Trail-like line: uniform flux spread far beyond the disc around the
      // (arbitrary) peak pixel.
      const linePixels = Array.from({ length: 30 }, (_, i) => ({ x: 1 + i, y: 5, value: 100 }));
      const line = planeWithPixels(34, 10, linePixels);
      const lineBg = flatBackground(line.lum.data.length, 0, 1);
      const lineM = measureSource(line.component, line.lum, lineBg, 4);
      // At most 9 of the 30 uniform pixels can sit within 4px of the peak.
      expect(lineM.concentration).toBeLessThan(0.35);
    });

    it('should clamp below-background pixels to zero weight', () => {
      const { lum, component } = planeWithPixels(4, 4, [
        { x: 1, y: 1, value: 50 },
        { x: 2, y: 1, value: 5 },
      ]);
      const bg = flatBackground(lum.data.length, 10, 1);

      const m = measureSource(component, lum, bg, 8);

      // The 5-valued pixel is below the background of 10 and contributes 0.
      expect(m.flux).toBeCloseTo(40, 6);
      expect(m.peak).toBeCloseTo(40, 6);
      expect(m.cx).toBeCloseTo(1, 6);
      expect(m.cy).toBeCloseTo(1, 6);
      expect(m.area).toBe(2);
    });
  });
});
