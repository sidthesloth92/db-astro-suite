import { DetectionOptions } from '../models/detection.types';

/**
 * Default tuning parameters for the star detection pipeline, chosen for
 * typical deep-sky astrophotography frames.
 *
 * The concentration values were derived by measuring synthetic fields modeled
 * on a real problem report: a saturated star with its own asymmetric
 * diffraction arms measures elongation ~2.8 — the same as an M82-like galaxy —
 * so elongation cannot separate them. Flux concentration can: the star scores
 * ~0.6+, the galaxy ~0.15, a satellite trail ~0.06.
 */
export const DETECTION_OPTIONS: DetectionOptions = {
  maxDimension: 1536,
  kSigma: 4,
  tileSize: 64,
  minArea: 2,
  maxArea: 400,
  maxAreaHard: 6400,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.92,
  minConcentration: 0.35,
  concentrationRadius: 8,
  extendedMinPeak: 100,
  maxStars: 4000,
};

/**
 * Weight fraction of the peak that counts as the near-peak core when sizing
 * the adaptive concentration disc.
 */
export const CONCENTRATION_PLATEAU_FRACTION = 0.9;

/**
 * Multiplier applied to the core's area-equivalent radius when sizing the
 * adaptive concentration disc.
 */
export const CONCENTRATION_RADIUS_SCALE = 1.5;

/**
 * Cap on the full-resolution refinement window radius. Big saturated stars can
 * produce detection blobs whose derived window would otherwise reach several
 * hundred pixels a side, and refinement cost is quadratic in the radius.
 */
export const REFINE_WINDOW_RADIUS_MAX = 128;

/**
 * Weight fraction of the peak that counts as the saturated plateau when the
 * refinement centroid picks its core region around the peak pixel.
 */
export const REFINE_PLATEAU_FRACTION = 0.9;

/**
 * Multiplier applied to the plateau's area-equivalent radius when sizing the
 * refinement core region. The radius comes from the near-peak pixel COUNT,
 * never from pixel distances — a lone bright noise pixel or a similar
 * neighbour elsewhere in the window must not balloon the core back into a
 * whole-window centroid.
 */
export const REFINE_CORE_RADIUS_SCALE = 1.5;

/**
 * Padding (px) added around the measured plateau radius to form the
 * refinement core region.
 */
export const REFINE_CORE_PADDING_PX = 3;

/**
 * Radius (px) around the approximate position the anchor peak is searched in
 * first. Detection's centroid is at worst a few pixels off its star, so the
 * true peak is nearby; searching the whole window instead lets a brighter
 * neighbour capture the anchor.
 */
export const REFINE_ANCHOR_RADIUS_PX = 12;

/**
 * Minimum weight of the near-approx anchor, as a fraction of the window's
 * global peak, for it to be trusted. Below this the approximate position is
 * assumed to have missed the star and the global peak is used instead.
 */
export const REFINE_ANCHOR_MIN_PEAK_FRACTION = 0.15;

/** Smallest refinement core radius, so tiny stars still gather enough pixels. */
export const REFINE_CORE_RADIUS_MIN_PX = 4;
