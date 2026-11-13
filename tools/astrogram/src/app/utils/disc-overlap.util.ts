/**
 * Whether any disc centred on a horizontal axis covers part of a rectangle,
 * e.g. an axis label that a planet drawn on top of it would hide.
 *
 * @param left Rectangle's left edge.
 * @param right Rectangle's right edge.
 * @param top Rectangle's top edge.
 * @param bottom Rectangle's bottom edge.
 * @param axisY Vertical position of every disc's centre.
 * @param discs Disc centres along the axis and their radii.
 */
export function rectTouchesDiscs(
  left: number,
  right: number,
  top: number,
  bottom: number,
  axisY: number,
  discs: readonly { readonly cx: number; readonly r: number }[],
): boolean {
  const nearestY = Math.min(Math.max(axisY, top), bottom);
  return discs.some(({ cx, r }) => {
    const nearestX = Math.min(Math.max(cx, left), right);
    return Math.hypot(cx - nearestX, axisY - nearestY) < r;
  });
}
