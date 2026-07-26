import { StarColor } from '../models/star-appearance.model';

/**
 * Star tint palette: white plus three intense, clearly distinguishable
 * colours. Each RGB is a fully vivid anchor — the rendered tint mixes from
 * white toward this anchor according to the Star Color Intensity control.
 */
export const STAR_COLORS: readonly StarColor[] = [
  { r: 130, g: 165, b: 255, weight: 0.28 }, // natural blue (B-class, Rigel-like)
  { r: 248, g: 247, b: 255, weight: 0.34 }, // white
  { r: 255, g: 205, b: 60, weight: 0.22 }, // yellow
  { r: 255, g: 170, b: 95, weight: 0.16 }, // natural orange (K-class amber)
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

/** Star Color Intensity slider level that reproduces the reference natural look. */
export const COLOR_INTENSITY_REFERENCE_LEVEL = 3;

/** White→anchor mix applied at the reference intensity level. */
export const COLOR_INTENSITY_REFERENCE_MIX = 0.85;

/** Top level of the Star Color Intensity slider. */
export const COLOR_INTENSITY_MAX_LEVEL = 10;

/**
 * Mix reached at the top intensity level. Values above 1 extrapolate past the
 * palette anchor (with per-channel clamping), deepening saturation beyond the
 * natural tint for users who want obviously coloured stars.
 */
export const COLOR_INTENSITY_MAX_MIX = 1.6;

/**
 * Colorful Stars slider value at which the palette weights apply unscaled;
 * below it non-white weights shrink toward an all-white field, above it they
 * grow quadratically.
 */
export const COLORFUL_RATIO_NEUTRAL = 50;

/**
 * Twinkle amplitude contributed per Star Twinkle slider unit (0–10 scale).
 * Deliberately steep so the slider reads instantly: 2 gives the gentle
 * H.264-safe 0.18 swing, the default 4 shimmers visibly, 10 pulses hard.
 */
export const TWINKLE_AMPLITUDE_PER_STRENGTH = 0.09;

/** Angular speed of the twinkle oscillation in radians per second. */
export const TWINKLE_SPEED = 2.1;

/** Spike magnitude threshold when the Diffraction Spikes slider sits at 0. */
export const SPIKE_THRESHOLD_BASE = 1;

/**
 * Threshold reduction per Diffraction Spikes slider unit (0–10 scale).
 * Deliberately steep so the slider reads instantly: the default 3 spikes
 * roughly the brightest seventh of stars, 10 spikes about three quarters.
 */
export const SPIKE_THRESHOLD_PER_AMOUNT = 0.095;

/** Spike arm length (relative to glow size) when the slider sits at 0. */
export const SPIKE_SIZE_FACTOR_BASE = 2.0;

/**
 * Extra spike arm length per Diffraction Spikes slider unit — at 10 the arms
 * stretch to 4.5× the glow so the slider's top end is unmistakable.
 */
export const SPIKE_SIZE_FACTOR_PER_AMOUNT = 0.25;

/** Spike arm alpha when the slider sits at 0. */
export const SPIKE_ALPHA_BASE = 0.4;

/**
 * Extra spike arm alpha per Diffraction Spikes slider unit (clamped to 1),
 * so higher slider values brighten the arms as well as adding more of them.
 */
export const SPIKE_ALPHA_PER_AMOUNT = 0.06;
