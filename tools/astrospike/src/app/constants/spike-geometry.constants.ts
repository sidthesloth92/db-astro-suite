/**
 * Tuning constants for how a star's measured brightness maps onto the geometry
 * of its diffraction spikes. These were chosen against dense real star fields:
 * a flatter exponent or a higher alpha floor makes every spiked star look
 * roughly the same size, which reads as an artificial crosshatch rather than
 * real diffraction.
 */

/**
 * Exponent applied to the flux ratio when deriving a star's relative spike
 * scale. Lower values compress the range (faint stars get almost as much spike
 * as bright ones); higher values make only the very brightest stars stand out.
 */
export const SPIKE_BRIGHTNESS_EXPONENT = 0.6;

/**
 * Minimum share of the preset's peak alpha given to the faintest spiked star,
 * so its spikes stay visible without competing with the brightest stars.
 */
export const SPIKE_ALPHA_FLOOR = 0.15;

/** Narrowest renderable spike arm, in pixels. */
export const SPIKE_THICKNESS_MIN_PX = 1.5;

/** Widest spike arm, in pixels — keeps bright stars from turning into bars. */
export const SPIKE_THICKNESS_MAX_PX = 16;
