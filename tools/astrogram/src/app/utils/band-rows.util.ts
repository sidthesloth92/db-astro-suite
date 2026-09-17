/** Most bands a single run of band credits holds before it splits in two. */
export const BAND_ROW_MAX = 4;

/**
 * Where a run of band credits ("L 2h 42m · Hα 6h 0m · …") splits into two
 * balanced rows: the number of bands on the first row, or `0` when the run
 * is short enough to stay on one line.
 *
 * Left to wrap on its own, a seven-band run filled the first line and left the
 * last band alone on the second ("B 30m"). Splitting at the midpoint gives
 * rows of four and three, with no separator dangling at a line end.
 *
 * @param count Number of bands.
 * @param maxPerRow Longest run kept on one line.
 */
export function bandRowBreak(count: number, maxPerRow = BAND_ROW_MAX): number {
  if (count <= maxPerRow) return 0;
  return Math.ceil(count / 2);
}
