import { StarAdjustment } from '../models/star-adjustment.model';

/**
 * The neutral adjustment: a star carrying this renders exactly as the global
 * controls alone would render it.
 */
export const DEFAULT_STAR_ADJUSTMENT: StarAdjustment = {
  lengthFactor: 1,
  intensityFactor: 1,
  rotationDeg: 0,
  style: null,
};

/** Lower bound of a single star's extra length multiplier. */
export const STAR_LENGTH_MIN = 0.2;

/** Upper bound of a single star's extra length multiplier. */
export const STAR_LENGTH_MAX = 3;

/** Lower bound of a single star's extra brightness multiplier. */
export const STAR_INTENSITY_MIN = 0.2;

/** Upper bound of a single star's extra brightness multiplier. */
export const STAR_INTENSITY_MAX = 2;

/** Step used by both per-star multiplier sliders. */
export const STAR_FACTOR_STEP = 0.05;

/** Lower bound of a single star's extra rotation, in degrees. */
export const STAR_ROTATION_MIN = 0;

/** Upper bound of a single star's extra rotation, in degrees. */
export const STAR_ROTATION_MAX = 90;

/** Step of the per-star rotation slider, in degrees. */
export const STAR_ROTATION_STEP = 1;
