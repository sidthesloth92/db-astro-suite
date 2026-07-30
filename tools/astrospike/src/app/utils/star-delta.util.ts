/**
 * Rounds to two decimals and drops trailing zeros, so a readout says `1.4`
 * rather than `1.40` and `1` rather than `1.00`.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a per-star multiplier as the signed delta a user thinks in: a factor
 * of 1.4 reads `+0.4×`, and a neutral factor reads `±0×` rather than `+0×` so
 * "untouched" is visibly distinct from "nudged up by nothing".
 */
export function signedFactor(factor: number): string {
  const delta = round2(factor - 1);
  if (delta === 0) {
    return '±0×';
  }
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}×`;
}

/**
 * Formats a per-star rotation offset as signed whole degrees, with the same
 * neutral form as {@link signedFactor}.
 */
export function signedDegrees(degrees: number): string {
  const rounded = Math.round(degrees);
  if (rounded === 0) {
    return '±0°';
  }
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}°`;
}
