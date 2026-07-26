import { StarColor } from '../models/star-appearance.model';

/**
 * Natural star tints loosely modelled on real spectral classes, weighted so
 * the field stays predominantly near-white with occasional warm and cool
 * accents (a realistic night sky, not confetti).
 */
export const STAR_COLORS: readonly StarColor[] = [
  { r: 170, g: 191, b: 255, weight: 0.18 }, // blue-white (B/A class)
  { r: 248, g: 247, b: 255, weight: 0.38 }, // white (A/F class)
  { r: 255, g: 244, b: 214, weight: 0.22 }, // yellow-white (G class)
  { r: 255, g: 221, b: 154, weight: 0.12 }, // yellow (K class)
  { r: 255, g: 187, b: 123, weight: 0.07 }, // orange (K/M class)
  { r: 255, g: 148, b: 110, weight: 0.03 }, // red (M class)
];

/** Palette index of the plain white entry — shooting stars always use it. */
export const WHITE_STAR_INDEX = 1;

/** Pixel size of each pre-rendered square star sprite canvas. */
export const STAR_SPRITE_SIZE = 128;

/**
 * Exponent shaping the magnitude distribution: `random()^exponent` skews the
 * roll toward 0 so bright (high-magnitude) stars stay rare.
 */
export const MAGNITUDE_EXPONENT = 2.2;

/** Size multiplier applied at magnitude 0 (dimmest star). */
export const MAGNITUDE_SIZE_MIN = 0.6;

/** Size multiplier applied at magnitude 1 (brightest star). */
export const MAGNITUDE_SIZE_MAX = 1.6;

/** Alpha multiplier applied at magnitude 0; magnitude 1 renders at full alpha. */
export const MAGNITUDE_ALPHA_MIN = 0.5;

/**
 * Peak fractional brightness swing of the twinkle. Deliberately gentle so the
 * shimmer survives H.264 export without flicker artefacts.
 */
export const TWINKLE_AMPLITUDE = 0.18;

/** Angular speed of the twinkle oscillation in radians per second. */
export const TWINKLE_SPEED = 2.1;

/**
 * Minimum magnitude for a star to earn diffraction spikes — keeps them
 * reserved for roughly the brightest tenth of the field.
 */
export const SPIKE_MAGNITUDE_THRESHOLD = 0.82;

/** Spike sprite draw size relative to the star's glow sprite size. */
export const SPIKE_SIZE_FACTOR = 2.2;

/** Alpha applied to the spike sprite so glints stay subtle. */
export const SPIKE_ALPHA = 0.55;
