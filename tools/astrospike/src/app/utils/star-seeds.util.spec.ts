import { DETECTION_OPTIONS } from '../constants/detection.constants';
import {
  BackgroundMap,
  DetectionOptions,
  LuminanceImage,
  SourceComponent,
  SourceMeasurement,
} from '../models/detection.types';
import { extractSeedStars } from './star-seeds.util';

const WIDTH = 200;
const HEIGHT = 150;

/** Options shared by every scene; the production defaults. */
const OPTS: DetectionOptions = { ...DETECTION_OPTIONS };

/**
 * Builds a luminance plane, a zero background, and one component holding
 * every pixel the painter lit above the mask floor — the shape a single
 * flood-filled component has when it reaches extractSeedStars.
 */
function scene(paint: (set: (x: number, y: number, value: number) => void) => void): {
  lum: LuminanceImage;
  bg: BackgroundMap;
  component: SourceComponent;
} {
  const data = new Float32Array(WIDTH * HEIGHT);
  const set = (x: number, y: number, value: number): void => {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      const idx = y * WIDTH + x;
      data[idx] = Math.max(data[idx], value);
    }
  };
  paint(set);
  const pixels: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 2) {
      pixels.push(i);
    }
  }
  return {
    lum: { data, width: WIDTH, height: HEIGHT },
    bg: { background: new Float32Array(WIDTH * HEIGHT), sigma: 1 },
    component: { pixels: Int32Array.from(pixels), count: pixels.length },
  };
}

/** Paints a round Gaussian star. */
function star(
  set: (x: number, y: number, value: number) => void,
  cx: number,
  cy: number,
  amp: number,
  sigma: number,
): void {
  const radius = Math.ceil(sigma * 5);
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      set(x, y, amp * Math.exp(-d2 / (2 * sigma * sigma)));
    }
  }
}

/** Nearest accepted seed to a point, or null. */
function seedNear(seeds: SourceMeasurement[], x: number, y: number, radius = 4): SourceMeasurement | null {
  let best: SourceMeasurement | null = null;
  for (const seed of seeds) {
    const d = Math.hypot(seed.cx - x, seed.cy - y);
    if (d <= radius && (best === null || d < Math.hypot(best.cx - x, best.cy - y))) {
      best = seed;
    }
  }
  return best;
}

describe('star-seeds.util', () => {
  describe('extractSeedStars', () => {
    it('should accept a single bright star as one seed at its core', () => {
      const { lum, bg, component } = scene((set) => star(set, 60, 60, 200, 3));

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(1);
      expect(Math.hypot(seeds[0].cx - 60, seeds[0].cy - 60)).toBeLessThan(1.5);
      expect(seeds[0].flux).toBeGreaterThan(0);
    });

    it('should recover both stars merged into one component by a faint bridge', () => {
      const { lum, bg, component } = scene((set) => {
        star(set, 50, 60, 200, 3);
        star(set, 120, 60, 180, 3);
        // Nebulosity bridge: above the mask floor, below half of either peak.
        for (let x = 50; x <= 120; x++) {
          for (let dy = -3; dy <= 3; dy++) {
            set(x, 60 + dy, 30);
          }
        }
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(2);
      expect(seedNear(seeds, 50, 60)).not.toBeNull();
      expect(seedNear(seeds, 120, 60)).not.toBeNull();
    });

    it('should suppress a shoulder bump whose half-weight region reaches a brighter star', () => {
      const { lum, bg, component } = scene((set) => {
        // A broad primary whose skirt stays above half the bump's peak all the
        // way across, so the bump's half-weight region climbs into the core.
        star(set, 60, 60, 230, 6);
        star(set, 72, 60, 150, 3);
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(1);
      expect(Math.hypot(seeds[0].cx - 60, seeds[0].cy - 60)).toBeLessThan(4);
    });

    it('should reject a galaxy bar, whose half-weight region is elongated', () => {
      const { lum, bg, component } = scene((set) => {
        // An elongated Gaussian ridge: bright enough to seed, but the region
        // grown at half its peak is a bar, not a star core.
        for (let y = 30; y <= 90; y++) {
          for (let x = 70; x <= 130; x++) {
            const u = (x - 100) / 24;
            const v = (y - 60) / 5;
            set(x, y, 180 * Math.exp(-(u * u + v * v)));
          }
        }
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(0);
    });

    it('should reject a satellite trail end to end', () => {
      const { lum, bg, component } = scene((set) => {
        for (let x = 20; x <= 180; x++) {
          const y = 40 + Math.round((x - 20) * 0.4);
          for (let o = -2; o <= 2; o++) {
            set(x, y + o, 170 * Math.exp(-(o * o) / 2));
          }
        }
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(0);
    });

    it('should ignore maxima below the extended peak floor', () => {
      const { lum, bg, component } = scene((set) => star(set, 60, 60, OPTS.extendedMinPeak - 20, 3));

      expect(extractSeedStars(component, lum, bg, OPTS).length).toBe(0);
    });

    it('should collapse a saturated plateau of equal maxima into one seed', () => {
      const { lum, bg, component } = scene((set) => {
        star(set, 60, 60, 255, 4);
        // Flat-top the core the way saturation does: several equal maxima.
        for (let y = 57; y <= 63; y++) {
          for (let x = 57; x <= 63; x++) {
            set(x, y, 255);
          }
        }
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(1);
    });

    it('should rank a brighter star above a fainter one through disc flux', () => {
      const { lum, bg, component } = scene((set) => {
        star(set, 50, 60, 250, 4);
        star(set, 140, 60, 120, 2);
        for (let x = 50; x <= 140; x++) {
          set(x, 60, 25);
          set(x, 61, 25);
        }
      });

      const seeds = extractSeedStars(component, lum, bg, OPTS);

      expect(seeds.length).toBe(2);
      const bright = seedNear(seeds, 50, 60);
      const faint = seedNear(seeds, 140, 60);
      expect(bright).not.toBeNull();
      expect(faint).not.toBeNull();
      if (bright !== null && faint !== null) {
        expect(bright.flux).toBeGreaterThan(faint.flux);
      }
    });
  });
});
