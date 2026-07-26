import { StarColor } from '../models/star-appearance.model';

/**
 * Star tint palette: white plus three intense, clearly distinguishable
 * colours. Each RGB is a fully vivid anchor — the rendered tint mixes from
 * white toward this anchor according to the Star Color Intensity control.
 */
export const STAR_COLORS: readonly StarColor[] = [
  { r: 30, g: 140, b: 255, weight: 0.28 }, // azure blue
  { r: 248, g: 247, b: 255, weight: 0.34 }, // white
  { r: 255, g: 205, b: 60, weight: 0.22 }, // yellow
  { r: 255, g: 130, b: 30, weight: 0.16 }, // orange
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

/**
 * Size multiplier applied at magnitude 1 (brightest star). Deliberately
 * generous — the rare bright stars are the only ones large enough on screen
 * to carry visible colour, so they double as the field's colour carriers.
 */
export const MAGNITUDE_SIZE_MAX = 2.4;

/** Alpha multiplier applied at magnitude 0; magnitude 1 renders at full alpha. */
export const MAGNITUDE_ALPHA_MIN = 0.5;

/**
 * How much of the sprite's hot core takes the tint at full colour intensity.
 * Small stars show mostly core, so without core tinting they read as white.
 */
export const CORE_TINT_FACTOR = 0.85;

/**
 * Colorful Stars slider value at which the palette weights apply unscaled;
 * below it non-white weights shrink toward an all-white field, above it they
 * grow quadratically.
 */
export const COLORFUL_RATIO_NEUTRAL = 50;

/**
 * Twinkle amplitude contributed per Star Twinkle slider unit (0–10 scale).
 * The default slider value of 4 yields a gentle 0.18 swing that survives
 * H.264 export without flicker artefacts.
 */
export const TWINKLE_AMPLITUDE_PER_STRENGTH = 0.045;

/** Angular speed of the twinkle oscillation in radians per second. */
export const TWINKLE_SPEED = 2.1;

/** Spike magnitude threshold when the Diffraction Spikes slider sits at 0. */
export const SPIKE_THRESHOLD_BASE = 1;

/**
 * Threshold reduction per Diffraction Spikes slider unit (0–10 scale). The
 * default slider value of 3 yields a 0.82 threshold — roughly the brightest
 * tenth of stars.
 */
export const SPIKE_THRESHOLD_PER_AMOUNT = 0.06;

/** Spike sprite draw size relative to the star's glow sprite size. */
export const SPIKE_SIZE_FACTOR = 2.2;

/** Alpha applied to the spike sprite so glints stay subtle. */
export const SPIKE_ALPHA = 0.55;
