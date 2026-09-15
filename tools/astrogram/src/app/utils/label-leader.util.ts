/**
 * SVG `points` for a leader line tying a label that was slid along an axis
 * back to the mark it names: straight out of the mark, bent at `kneeY`, then
 * across to the label. Works in either direction (label above or below).
 *
 * Returns `null` when the label already sits within `minOffset` of its mark,
 * where position alone makes the pairing obvious and a line is only clutter.
 *
 * @param markX Position of the mark along the axis.
 * @param labelX Position of the label's centre along the axis.
 * @param startY Where the line leaves the mark.
 * @param kneeY Where the line bends toward the label; clamped between start and end.
 * @param endY Where the line stops, just short of the label.
 * @param minOffset Smallest label offset that gets a line.
 */
export function leaderPoints(
  markX: number,
  labelX: number,
  startY: number,
  kneeY: number,
  endY: number,
  minOffset: number,
): string | null {
  if (Math.abs(labelX - markX) < minOffset) return null;
  const knee = Math.min(Math.max(kneeY, Math.min(startY, endY)), Math.max(startY, endY));
  return `${markX},${startY} ${markX},${knee} ${labelX},${endY}`;
}
