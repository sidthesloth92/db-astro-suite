import {
  COLORFUL_RATIO_NEUTRAL,
  MAGNITUDE_EXPONENT,
  SPIKE_THRESHOLD_BASE,
  SPIKE_THRESHOLD_PER_AMOUNT,
  STAR_COLORS,
  TWINKLE_AMPLITUDE_PER_STRENGTH,
  WHITE_STAR_INDEX,
} from '../constants/star-appearance.constant';
import { RgbColor } from '../models/star-appearance.model';

/**
 * Linearly interpolates between two RGB colours.
 *
 * @param from - Colour at t = 0
 * @param to - Colour at t = 1
 * @param t - Mix factor, clamped to [0, 1]
 * @returns The mixed colour with rounded channels
 */
export function mixRgb(from: RgbColor, to: RgbColor, t: number): RgbColor {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(from.r + (to.r - from.r) * clamped),
    g: Math.round(from.g + (to.g - from.g) * clamped),
    b: Math.round(from.b + (to.b - from.b) * clamped),
  };
}

/**
 * Resolves the rendered tint for a palette anchor at the given Star Color
 * Intensity: 0 renders pure white, 100 renders the fully vivid anchor.
 *
 * @param color - Vivid palette anchor colour
 * @param intensity - Star Color Intensity slider value (0–100)
 * @returns The tint to render sprites with
 */
export function tintForIntensity(color: RgbColor, intensity: number): RgbColor {
  return mixRgb({ r: 255, g: 255, b: 255 }, color, intensity / 100);
}

/**
 * Maps the Star Twinkle slider (0–100) to the fractional brightness swing of
 * the twinkle oscillation. 0 disables the twinkle entirely.
 *
 * @param strength - Star Twinkle slider value (0–100)
 * @returns The twinkle amplitude
 */
export function twinkleAmplitudeForStrength(strength: number): number {
  return strength * TWINKLE_AMPLITUDE_PER_STRENGTH;
}

/**
 * Maps the Diffraction Spikes slider (0–100) to the minimum magnitude a star
 * needs to earn spikes. At 0 the threshold sits at 1, so no star qualifies;
 * higher values lower the bar so more bright stars get spikes.
 *
 * @param amount - Diffraction Spikes slider value (0–100)
 * @returns The magnitude threshold for drawing spikes
 */
export function spikeThresholdForAmount(amount: number): number {
  return SPIKE_THRESHOLD_BASE - amount * SPIKE_THRESHOLD_PER_AMOUNT;
}

/**
 * Rolls a palette index over {@link STAR_COLORS} proportionally to each
 * entry's weight, with every non-white weight scaled quadratically by the
 * Colorful Stars ratio: at 0 the field is all white, at
 * {@link COLORFUL_RATIO_NEUTRAL} the base weights apply unchanged, and higher
 * values trade white stars for coloured ones.
 *
 * @param colorfulRatio - Colorful Stars slider value (0–100)
 * @param random - Uniform [0, 1) source, injectable for deterministic tests
 * @returns An index into {@link STAR_COLORS}
 */
export function pickWeightedColorIndex(
  colorfulRatio: number,
  random: () => number = Math.random,
): number {
  const colorScale = Math.pow(colorfulRatio / COLORFUL_RATIO_NEUTRAL, 2);
  const weights = STAR_COLORS.map((color, index) =>
    index === WHITE_STAR_INDEX ? color.weight : color.weight * colorScale,
  );

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * totalWeight;

  for (let index = 0; index < weights.length; index++) {
    roll -= weights[index];
    if (roll < 0) {
      return index;
    }
  }
  return STAR_COLORS.length - 1;
}

/**
 * Draws an intrinsic brightness in [0, 1] (1 = brightest), shaped by
 * {@link MAGNITUDE_EXPONENT} so the distribution skews dim and genuinely
 * bright stars stay rare.
 *
 * @param random - Uniform [0, 1) source, injectable for deterministic tests
 * @returns The star's magnitude in [0, 1]
 */
export function randomMagnitude(random: () => number = Math.random): number {
  return Math.pow(random(), MAGNITUDE_EXPONENT);
}
