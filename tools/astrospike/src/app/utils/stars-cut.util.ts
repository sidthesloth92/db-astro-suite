/**
 * Maps a normalized "stars cut" slider value to the number of stars to keep.
 *
 * The mapping is exponential in the star count: `n = round(totalStars ^ v)`
 * with `v` clamped to [0, 1], so the slider sweeps from a single brightest
 * star (`v = 0`) to the full detection list (`v = 1`) with fine control over
 * the bright end. Returns 0 when there are no stars; otherwise the result is
 * clamped to [1, totalStars].
 */
export function sliceCountForValue(v: number, totalStars: number): number {
  if (totalStars <= 0) {
    return 0;
  }
  const clamped = Math.min(1, Math.max(0, v));
  return Math.min(totalStars, Math.max(1, Math.round(Math.pow(totalStars, clamped))));
}
