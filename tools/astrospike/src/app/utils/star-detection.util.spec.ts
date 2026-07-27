import { DetectedStar } from '../models/detected-star.model';
import { DetectionOptions } from '../models/detection.types';
import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { detectStars } from './star-detection.util';
import { renderSyntheticField } from './star-field-fixture.util';

const WIDTH = 900;
const HEIGHT = 700;

/** Nebulosity: flat base plus a gentle linear gradient across the frame. */
const NEBULOSITY: SyntheticBackground = { base: 12, gradientX: 0.01, gradientY: 0.008 };

/** The 20 real stars the detector must find (varied amplitude and sigma). */
const REAL_STARS: readonly SyntheticStar[] = [
  { x: 101.3, y: 81.7, amplitude: 230, sigma: 2.8 },
  { x: 240.6, y: 65.2, amplitude: 120, sigma: 1.6 },
  { x: 405.1, y: 90.4, amplitude: 200, sigma: 2.2, color: { r: 255, g: 90, b: 70 } },
  { x: 580.7, y: 70.9, amplitude: 80, sigma: 1.4 },
  { x: 760.2, y: 110.5, amplitude: 150, sigma: 2.0 },
  { x: 85.4, y: 230.8, amplitude: 60, sigma: 1.3 },
  { x: 300.9, y: 260.3, amplitude: 250, sigma: 3.0 },
  { x: 515.5, y: 240.6, amplitude: 100, sigma: 1.8 },
  { x: 700.8, y: 280.2, amplitude: 180, sigma: 2.4, color: { r: 80, g: 120, b: 255 } },
  { x: 860.1, y: 220.7, amplitude: 90, sigma: 1.5 },
  { x: 150.6, y: 400.2, amplitude: 140, sigma: 1.9 },
  { x: 420.3, y: 430.8, amplitude: 70, sigma: 1.4 },
  { x: 640.9, y: 410.4, amplitude: 210, sigma: 2.5 },
  { x: 820.4, y: 450.1, amplitude: 110, sigma: 1.7 },
  { x: 60.8, y: 560.3, amplitude: 130, sigma: 1.8 },
  { x: 250.2, y: 590.7, amplitude: 95, sigma: 1.6 },
  { x: 470.6, y: 570.2, amplitude: 160, sigma: 2.1, color: { r: 255, g: 170, b: 90 } },
  { x: 680.3, y: 600.9, amplitude: 85, sigma: 1.5 },
  { x: 840.7, y: 580.4, amplitude: 240, sigma: 2.6 },
  { x: 330.4, y: 640.6, amplitude: 55, sigma: 1.3 },
];

/** Single-pixel hot spike: huge amplitude, sigma so tiny it occupies 1 px. */
const HOT_PIXEL: SyntheticStar = { x: 770, y: 500, amplitude: 240, sigma: 0.25 };

/**
 * Satellite trail simulated as a long row of overlapping small Gaussians —
 * long enough that its flux is spread far beyond the concentration disc, as a
 * real trail's is.
 */
const STREAK_Y = 340;
const STREAK_X_START = 380;
const STREAK_X_END = 380 + 59 * 2;
const STREAK: readonly SyntheticStar[] = Array.from({ length: 60 }, (_, i) => ({
  x: STREAK_X_START + i * 2,
  y: STREAK_Y,
  amplitude: 130,
  sigma: 1.2,
}));

/**
 * Big saturated star: the flat clamped core inflates its blob far beyond
 * maxArea, which used to make detection silently drop it — the defect reported
 * from real M82 data where the brightest stars got no spikes.
 */
const SATURATED_STAR: SyntheticStar = { x: 170.5, y: 170.5, amplitude: 4000, sigma: 6 };

/**
 * Elongated diffuse galaxy: overlapping wide Gaussians along y. Its
 * concentration is low even though its elongation is similar to a star with
 * asymmetric arms, so it must stay undetected.
 */
const GALAXY_X = 120;
const GALAXY_Y = 520;
const GALAXY: readonly SyntheticStar[] = Array.from({ length: 5 }, (_, i) => ({
  x: GALAXY_X,
  y: GALAXY_Y - 40 + i * 20,
  amplitude: 110,
  sigma: 13,
}));

/** Detection-friendly options: maxDimension >= 900 keeps factor at 1. */
const OPTS: DetectionOptions = {
  maxDimension: 1024,
  kSigma: 4,
  tileSize: 64,
  minArea: 3,
  maxArea: 400,
  maxAreaHard: 6400,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.9,
  minConcentration: 0.35,
  concentrationRadius: 8,
  extendedMinPeak: 100,
  maxStars: 500,
};

/** Finds the detection closest to (x, y), or null when the list is empty. */
function nearestDetection(result: readonly DetectedStar[], x: number, y: number): DetectedStar | null {
  let best: DetectedStar | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (const star of result) {
    const dx = star.x - x;
    const dy = star.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      best = star;
      bestDistSq = distSq;
    }
  }
  return best;
}

describe('detectStars (engine integration)', () => {
  let rgba: Uint8ClampedArray;
  let result: DetectedStar[];

  beforeAll(() => {
    rgba = renderSyntheticField(
      WIDTH,
      HEIGHT,
      [...REAL_STARS, HOT_PIXEL, ...STREAK, SATURATED_STAR, ...GALAXY],
      NEBULOSITY,
      2,
      1234,
    );
    result = detectStars(rgba, WIDTH, HEIGHT, OPTS);
  });

  it('should find every injected real star within 1 px of its position', () => {
    for (const injected of REAL_STARS) {
      const match = nearestDetection(result, injected.x, injected.y);
      expect(match).withContext(`star at (${injected.x}, ${injected.y})`).not.toBeNull();
      if (match !== null) {
        const distance = Math.hypot(match.x - injected.x, match.y - injected.y);
        expect(distance)
          .withContext(`star at (${injected.x}, ${injected.y})`)
          .toBeLessThanOrEqual(1);
      }
    }
  });

  it('should return results sorted by flux descending', () => {
    for (let i = 1; i < result.length; i++) {
      expect(result[i].flux).toBeLessThanOrEqual(result[i - 1].flux);
    }
  });

  it('should assign ids 0..n-1 in sorted order', () => {
    expect(result.map((s) => s.id)).toEqual(result.map((_, i) => i));
  });

  it('should not report the single-pixel hot spike as a star', () => {
    for (const star of result) {
      const distance = Math.hypot(star.x - HOT_PIXEL.x, star.y - HOT_PIXEL.y);
      expect(distance).withContext('detection near the hot pixel').toBeGreaterThan(3);
    }
  });

  it('should not report the elongated streak as a star', () => {
    for (const star of result) {
      const insideStreakBand =
        Math.abs(star.y - STREAK_Y) <= 4 &&
        star.x >= STREAK_X_START - 4 &&
        star.x <= STREAK_X_END + 4;
      expect(insideStreakBand).withContext('detection inside the streak band').toBeFalse();
    }
  });

  it('should only report detections that correspond to injected stars', () => {
    const injected = [...REAL_STARS, SATURATED_STAR];
    expect(result.length).toBe(injected.length);
    for (const star of result) {
      const distances = injected.map((s) => Math.hypot(star.x - s.x, star.y - s.y));
      expect(Math.min(...distances)).toBeLessThanOrEqual(2);
    }
  });

  it('should detect the big saturated star and centre it on its core', () => {
    // Regression for the M82 report: the brightest stars in a frame got no
    // spikes because their oversized blobs were consumed before measurement.
    const match = nearestDetection(result, SATURATED_STAR.x, SATURATED_STAR.y);
    expect(match).not.toBeNull();
    if (match !== null) {
      expect(Math.hypot(match.x - SATURATED_STAR.x, match.y - SATURATED_STAR.y)).toBeLessThan(2);
      // It is by far the brightest source, so it must lead the flux ordering.
      expect(match.id).toBe(0);
    }
  });

  it('should not report the diffuse elongated galaxy as a star', () => {
    for (const star of result) {
      const distance = Math.hypot(star.x - GALAXY_X, star.y - GALAXY_Y);
      expect(distance).withContext('detection inside the galaxy').toBeGreaterThan(30);
    }
  });

  it('should recover the dominant color channel of tinted stars', () => {
    const red = nearestDetection(result, 405.1, 90.4);
    const blue = nearestDetection(result, 700.8, 280.2);
    const orange = nearestDetection(result, 470.6, 570.2);
    expect(red).not.toBeNull();
    expect(blue).not.toBeNull();
    expect(orange).not.toBeNull();
    if (red !== null) {
      expect(red.color.r).toBe(255);
      expect(red.color.g).toBeLessThan(255);
      expect(red.color.b).toBeLessThan(255);
    }
    if (blue !== null) {
      expect(blue.color.b).toBe(255);
      expect(blue.color.r).toBeLessThan(255);
      expect(blue.color.g).toBeLessThan(255);
    }
    if (orange !== null) {
      expect(orange.color.r).toBe(255);
      expect(orange.color.g).toBeLessThan(255);
      expect(orange.color.b).toBeLessThan(orange.color.g);
    }
  });

  it('should respect the maxStars cap and keep the brightest stars', () => {
    const capped = detectStars(rgba, WIDTH, HEIGHT, { ...OPTS, maxStars: 5 });
    expect(capped.length).toBe(5);
    expect(capped.map((s) => s.id)).toEqual([0, 1, 2, 3, 4]);
    expect(capped.map((s) => s.flux)).toEqual(result.slice(0, 5).map((s) => s.flux));
  });
});
