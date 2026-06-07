/**
 * Tuning + palette for the astrogram living-constellation background field.
 * The colours are fixed brand-illustration values (the logo palette), not
 * themeable UI tokens — kept here so the field matches the mark + loader.
 */

/** Connecting-line gradient stops: pink → purple → blue (RGB tuples). */
export const CF_LINE_STOPS: readonly (readonly [number, number, number])[] = [
  [255, 42, 123],
  [168, 85, 247],
  [79, 124, 255],
];

/** Tagged-star reticle colour (pink). */
export const CF_PINK = '#ff2a7b';
/** Tagged-star reticle colour (cyan). */
export const CF_CYAN = '#19e6dd';

/** One background point per this many viewport px²… */
export const CF_DENSITY_DIVISOR = 9000;
/** …capped at this many points. */
export const CF_MAX_POINTS = 86;
/** Max distance (px) at which two nodes draw a connecting line. */
export const CF_LINK_DISTANCE = 120;
/** Number of tagged anchor stars. */
export const CF_TAGGED_COUNT = 4;
/** Device-pixel-ratio cap (keeps the backing store sane on hi-dpi). */
export const CF_MAX_DPR = 2;
