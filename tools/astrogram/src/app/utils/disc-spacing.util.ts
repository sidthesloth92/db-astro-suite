/**
 * Shrinks discs laid out along one axis just enough that neighbours no longer
 * overlap, leaving discs that already clear each other at their own radius.
 *
 * Each disc may use at most half the gap to each neighbour (less `gap`), and
 * the first disc must also clear `leftLimit` — the edge of whatever sits
 * before the row. No disc drops below `minRadius`, so a very crowded row
 * still shows every disc.
 *
 * @param centres Disc centres, in ascending order.
 * @param radii Preferred radius of each disc.
 * @param gap Space to keep between neighbouring discs.
 * @param minRadius Smallest radius a disc may be shrunk to.
 * @param leftLimit Position the first disc's left edge must stay right of.
 */
export function separateDiscs(
  centres: readonly number[],
  radii: readonly number[],
  gap: number,
  minRadius: number,
  leftLimit: number,
): number[] {
  return radii.map((radius, i) => {
    const room = [
      radius,
      i === 0 ? centres[i] - leftLimit - gap : (centres[i] - centres[i - 1] - gap) / 2,
      i < centres.length - 1 ? (centres[i + 1] - centres[i] - gap) / 2 : radius,
    ];
    return Math.max(minRadius, Math.min(...room));
  });
}
