import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { refineStar } from './star-refine.util';
import { renderSyntheticField } from './star-field-fixture.util';

const FLAT_BACKGROUND: SyntheticBackground = { base: 10, gradientX: 0, gradientY: 0 };

describe('refineStar', () => {
  it('should refine a synthetic star centroid to within 0.2 px with a positive peak', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [{ x: 31.6, y: 32.3, amplitude: 200, sigma: 2 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 31, 32, 8);

    expect(Math.abs(refined.x - 31.6)).toBeLessThan(0.2);
    expect(Math.abs(refined.y - 32.3)).toBeLessThan(0.2);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should recover the injected tint hue after max-channel normalization', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 200, sigma: 2, color: { r: 255, g: 128, b: 0 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 8);

    // Red is the dominant injected channel, so it normalizes to exactly 255.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeLessThan(refined.color.r);
    expect(refined.color.b).toBeLessThan(refined.color.g);
    expect(refined.color.b).toBeLessThan(50);
  });

  it('should return a sensible color for a star with a saturated core', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 900, sigma: 2.5, color: { r: 255, g: 180, b: 120 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 10);

    // The saturated core is excluded; the unsaturated ring keeps the tint.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeGreaterThan(refined.color.b);
    expect(refined.color.g).toBeLessThan(255);
    for (const channel of [refined.color.r, refined.color.g, refined.color.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
    expect(Math.abs(refined.x - 32)).toBeLessThan(0.5);
    expect(Math.abs(refined.y - 32)).toBeLessThan(0.5);
  });

  it('should stay centred on the core when the star drags an asymmetric bright arm', () => {
    // Regression for the misalignment reported on real telescope data: stars
    // already carry their own diffraction arms in the source image, and the
    // arms are rarely symmetric. A whole-window centroid gets dragged along
    // the brighter arm; the peak-anchored core centroid must not.
    const width = 160;
    const height = 120;
    const starX = 80;
    const starY = 60;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10); // flat sky
      }
    }
    // Bright star: the core saturates (as real bright stars do — the core
    // always clips before its arms), leaving a flat 255 plateau.
    for (let y = starY - 12; y <= starY + 12; y++) {
      for (let x = starX - 12; x <= starX + 12; x++) {
        const d2 = (x - starX) ** 2 + (y - starY) ** 2;
        put(x, y, Math.round(1200 * Math.exp(-d2 / (2 * 2.5 * 2.5))));
      }
    }
    // One long bright arm to the right, a stubby dim one to the left.
    for (let t = 3; t < 60; t++) {
      put(starX + t, starY, Math.round(160 * (1 - t / 60) ** 2));
    }
    for (let t = 3; t < 15; t++) {
      put(starX - t, starY, Math.round(50 * (1 - t / 15) ** 2));
    }

    const refined = refineStar(rgba, width, height, starX + 1.5, starY - 1, 40);

    expect(Math.abs(refined.x - starX)).toBeLessThan(1);
    expect(Math.abs(refined.y - starY)).toBeLessThan(1);
  });

  it('should not let a brighter neighbour in the window capture the anchor', () => {
    const width = 200;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10);
      }
    }
    const gauss = (cx: number, cy: number, amp: number, sigma: number): void => {
      const r = Math.ceil(sigma * 5);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          put(x, y, Math.round(amp * Math.exp(-d2 / (2 * sigma * sigma))));
        }
      }
    };
    gauss(80, 50, 120, 2.2); // the star being refined
    gauss(115, 50, 240, 2.6); // much brighter neighbour inside the window

    const refined = refineStar(rgba, width, height, 81, 49, 40);

    expect(Math.abs(refined.x - 80)).toBeLessThan(1.5);
    expect(Math.abs(refined.y - 50)).toBeLessThan(1.5);
  });

  it('should keep the core tight when a lone bright pixel sits elsewhere in the window', () => {
    const width = 160;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10);
      }
    }
    for (let y = 44; y <= 56; y++) {
      for (let x = 74; x <= 86; x++) {
        const d2 = (x - 80) ** 2 + (y - 50) ** 2;
        put(x, y, Math.round(150 * Math.exp(-d2 / (2 * 2 * 2))));
      }
    }
    // A hot pixel of comparable brightness 30 px away. With a distance-based
    // plateau this widened the core to include it and dragged the centroid.
    put(110, 50, 150);

    const refined = refineStar(rgba, width, height, 80, 50, 35);

    expect(Math.abs(refined.x - 80)).toBeLessThan(1);
    expect(Math.abs(refined.y - 50)).toBeLessThan(1);
  });

  it('should clamp the window at the image edges without crashing', () => {
    const width = 40;
    const height = 40;
    const stars: SyntheticStar[] = [{ x: 2.2, y: 1.8, amplitude: 150, sigma: 1.5 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 2, 2, 8);

    expect(Number.isFinite(refined.x)).toBeTrue();
    expect(Number.isFinite(refined.y)).toBeTrue();
    expect(Math.abs(refined.x - 2.2)).toBeLessThan(1);
    expect(Math.abs(refined.y - 1.8)).toBeLessThan(1);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should fall back to the approximate position when the window is empty', () => {
    const width = 16;
    const height = 16;
    const rgba = renderSyntheticField(width, height, [], FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, -50, -50, 4);

    expect(refined.x).toBe(-50);
    expect(refined.y).toBe(-50);
    expect(refined.peak).toBe(0);
    expect(refined.color).toEqual({ r: 255, g: 255, b: 255 });
  });
});
