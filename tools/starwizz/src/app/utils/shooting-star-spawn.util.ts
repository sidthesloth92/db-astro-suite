import { SHOOTING_STAR_AXIS_EPSILON } from '../constants/shooting-star.constant';

/**
 * Picks where a laterally drifting shooting star enters the frame: a point on
 * the upstream side, pushed `margin` px outside the visible frame, so the
 * streak is born off-screen and flies into view instead of popping in.
 *
 * Works for any drift angle. The streak's straight flight line is chosen by its
 * sideways offset across the flow, then followed backwards until it leaves the
 * frame (grown by `margin`), which lands on the left edge for rightward travel,
 * the bottom edge for upward travel, and either upstream edge for a diagonal.
 *
 * All values are in projected frame space: on-screen px from the frame centre.
 *
 * @param direction - Unit drift vector on screen (x right, y down)
 * @param halfWidth - Half the frame width in px
 * @param halfHeight - Half the frame height in px
 * @param margin - Extra px outside the frame, sized to hide the streak's glow
 * @param offsetFraction - Sideways position across the flow, from -1 to 1
 * @returns The off-screen entry point in px from the frame centre
 */
export function lateralEntryPoint(
  direction: { x: number; y: number },
  halfWidth: number,
  halfHeight: number,
  margin: number,
  offsetFraction: number,
): { x: number; y: number } {
  // Unit normal to the drift: the axis the flight lines are spread across.
  const normal = { x: -direction.y, y: direction.x };
  // Half the visible frame's extent across the flow, so every flight line
  // crosses the visible frame (never just the margin around it).
  const crossExtent = halfWidth * Math.abs(normal.x) + halfHeight * Math.abs(normal.y);
  const offset = offsetFraction * crossExtent;
  const lineX = normal.x * offset;
  const lineY = normal.y * offset;

  // Distance along the drift at which the flight line first enters the grown
  // frame: the latest of the per-axis entry distances (slab intersection).
  const entryX = axisEntryDistance(lineX, direction.x, halfWidth + margin);
  const entryY = axisEntryDistance(lineY, direction.y, halfHeight + margin);
  const entry = Math.max(entryX, entryY);

  return { x: lineX + direction.x * entry, y: lineY + direction.y * entry };
}

/**
 * Distance along the drift at which a flight line enters one axis' band of the
 * frame, or -Infinity when the drift has no component along that axis.
 */
function axisEntryDistance(origin: number, velocity: number, halfExtent: number): number {
  if (Math.abs(velocity) < SHOOTING_STAR_AXIS_EPSILON) {
    return -Infinity;
  }
  const upstreamEdge = velocity > 0 ? -halfExtent : halfExtent;
  return (upstreamEdge - origin) / velocity;
}

/**
 * Whether a projected point lies outside the frame once the frame is grown by
 * `margin` px on every side. Used while the view is flat (no rotation).
 *
 * @param point - Projected position in px from the frame centre
 * @param halfWidth - Half the frame width in px
 * @param halfHeight - Half the frame height in px
 * @param margin - Extra px around the frame that still counts as inside
 */
export function isOutsideFrameRect(
  point: { x: number; y: number },
  halfWidth: number,
  halfHeight: number,
  margin: number,
): boolean {
  return Math.abs(point.x) > halfWidth + margin || Math.abs(point.y) > halfHeight + margin;
}

/**
 * Whether a projected point lies outside the circle that encloses the frame,
 * grown by `margin` px. Unlike the rectangle test this holds however far the
 * view has rotated, so it is used for the spinning Forward / Backward presets.
 *
 * @param point - Projected position in px from the frame centre
 * @param halfWidth - Half the frame width in px
 * @param halfHeight - Half the frame height in px
 * @param margin - Extra px around the circle that still counts as inside
 */
export function isOutsideFrameCircle(
  point: { x: number; y: number },
  halfWidth: number,
  halfHeight: number,
  margin: number,
): boolean {
  return Math.hypot(point.x, point.y) > frameCircleRadius(halfWidth, halfHeight) + margin;
}

/**
 * Radius of the circle through the frame's corners, in px. Any point beyond it
 * is off-screen at every rotation of the view.
 *
 * @param halfWidth - Half the frame width in px
 * @param halfHeight - Half the frame height in px
 */
export function frameCircleRadius(halfWidth: number, halfHeight: number): number {
  return Math.hypot(halfWidth, halfHeight);
}
