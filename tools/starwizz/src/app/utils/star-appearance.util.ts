import { MAGNITUDE_EXPONENT, STAR_COLORS } from '../constants/star-appearance.constant';

/**
 * Rolls a palette index over {@link STAR_COLORS} proportionally to each
 * entry's weight, so common tints (white) dominate and rare tints (red)
 * appear occasionally.
 *
 * @param random - Uniform [0, 1) source, injectable for deterministic tests
 * @returns An index into {@link STAR_COLORS}
 */
export function pickWeightedColorIndex(random: () => number = Math.random): number {
  const totalWeight = STAR_COLORS.reduce((sum, color) => sum + color.weight, 0);
  let roll = random() * totalWeight;

  for (let index = 0; index < STAR_COLORS.length; index++) {
    roll -= STAR_COLORS[index].weight;
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
