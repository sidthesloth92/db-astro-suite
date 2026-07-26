import { StarColor } from '../models/star-appearance.model';

/**
 * Natural star tints loosely modelled on real spectral classes, weighted so
 * the field stays predominantly near-white with occasional warm and cool
 * accents. Each RGB is a fully vivid anchor — the rendered tint mixes from
 * white toward this anchor according to the Star Color Intensity control.
 */
export const STAR_COLORS: readonly StarColor[] = [
  { r: 110, g: 155, b: 255, weight: 0.18 }, // blue (B/A class)
  { r: 248, g: 247, b: 255, weight: 0.38 }, // white (A/F class)
  { r: 255, g: 238, b: 170, weight: 0.22 }, // yellow-white (G class)
  { r: 255, g: 210, b: 110, weight: 0.12 }, // yellow (K class)
  { r: 255, g: 165, b: 80, weight: 0.07 }, // orange (K/M class)
  { r: 255, g: 120, b: 90, weight: 0.03 }, // red (M class)
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
 * How much of the sprite's hot core takes the tint at full colour intensity.
 * Small stars show mostly core, so without core tinting they read as white.
 */
export const CORE_TINT_FACTOR = 0.6;

/**
 * Colorful Stars slider value at which the palette weights apply unscaled;
 * below it non-white weights shrink toward an all-white field, above it they
 * grow quadratically.
 */
export const COLORFUL_RATIO_NEUTRAL = 50;

/**
 * Twinkle amplitude contributed per Star Twinkle slider unit. The default
 * slider value of 40 yields a gentle 0.18 swing that survives H.264 export
 * without flicker artefacts.
 */
export const TWINKLE_AMPLITUDE_PER_STRENGTH = 0.0045;

/** Angular speed of the twinkle oscillation in radians per second. */
export const TWINKLE_SPEED = 2.1;

/** Spike magnitude threshold when the Diffraction Spikes slider sits at 0. */
export const SPIKE_THRESHOLD_BASE = 1;

/**
 * Threshold reduction per Diffraction Spikes slider unit. The default slider
 * value of 30 yields a 0.82 threshold — roughly the brightest tenth of stars.
 */
export const SPIKE_THRESHOLD_PER_AMOUNT = 0.006;

/** Spike sprite draw size relative to the star's glow sprite size. */
export const SPIKE_SIZE_FACTOR = 2.2;

/** Alpha applied to the spike sprite so glints stay subtle. */
export const SPIKE_ALPHA = 0.55;
