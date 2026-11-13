import { StarColor } from '../models/detected-star.model';

/**
 * Pushes a colour away from grey while holding its hue fixed.
 *
 * Saturation is measured as `1 - min / max` over the three channels. The two
 * lower channels are scaled toward the brightest one so the result's
 * saturation becomes `min(maxSaturation, factor * saturation)`; the brightest
 * channel is left untouched and the channel ORDER never changes, so a blue
 * input stays the same blue rather than drifting cyan (which is what scaling
 * every channel away from grey and clamping does). Grey in stays grey out,
 * `factor` 1 is the identity for any input at or below the ceiling, and an
 * input already above the ceiling is pulled down to it.
 *
 * @param color Input colour with channels in 0–255.
 * @param factor Multiplier on the input saturation; values below 1 desaturate.
 * @param maxSaturation Ceiling on the resulting saturation, clamped to [0, 1].
 * @returns The re-saturated colour with integer channels in 0–255.
 */
export function boostSaturation(
  color: StarColor,
  factor: number,
  maxSaturation: number,
): StarColor {
  const max = Math.max(color.r, color.g, color.b);
  if (max <= 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const min = Math.min(color.r, color.g, color.b);
  const ceiling = Math.min(1, Math.max(0, maxSaturation));
  const saturation = 1 - min / max;
  const target = Math.min(ceiling, saturation * factor);
  const scale = saturation > 0 ? target / saturation : 1;
  const towardsMax = (channel: number): number => Math.round(max - (max - channel) * scale);
  return { r: towardsMax(color.r), g: towardsMax(color.g), b: towardsMax(color.b) };
}
