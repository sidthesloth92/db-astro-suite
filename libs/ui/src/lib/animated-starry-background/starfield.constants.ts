/** Hard cap on the number of ambient stars regardless of screen size. */
export const MAX_STARS = 360;

/** Ambient stars per square CSS pixel — tuned for a calm, sparse field. */
export const STAR_DENSITY = 0.00022;

/** Debounce (ms) before rebuilding the field after a resize. */
export const RESIZE_DEBOUNCE_MS = 160;

/** One constellation cluster per this many px of width (minimum 3). */
export const CLUSTER_WIDTH_DIVISOR = 200;

/** Fewest nodes in a constellation cluster. */
export const CLUSTER_MIN_NODES = 5;

/** Most nodes in a constellation cluster. */
export const CLUSTER_MAX_NODES = 8;
