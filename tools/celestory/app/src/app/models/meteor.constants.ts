/** Mean seconds between shooting stars (exponentially distributed). */
export const METEOR_MEAN_INTERVAL_S = 7;

/** Minimum seconds between two shooting stars. */
export const METEOR_MIN_GAP_S = 2.5;

/** Flight time range in seconds. */
export const METEOR_DURATION_S: readonly [number, number] = [0.45, 1.1];

/** Path length range in degrees. */
export const METEOR_LENGTH_DEG: readonly [number, number] = [9, 24];

/** Altitude range of the path midpoint in degrees. */
export const METEOR_ALT_DEG: readonly [number, number] = [18, 80];

/** Fraction of the path lit as a trail behind the head. */
export const METEOR_TRAIL_FRACTION = 0.36;

/** Most shooting stars in flight at the same time. */
export const METEOR_MAX_ACTIVE = 3;
