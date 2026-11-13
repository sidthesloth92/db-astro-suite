import {
  GROWTH_CAP,
  GROWTH_EXPONENT,
  VOLUME_MARGIN,
} from '../constants/scene3d.constant';
import { FrameView, InflowPoint, Vec3 } from '../models/scene-pose.model';

/**
 * Depth for a uniform random number so stars are spread evenly through space: a view cone holds
 * more room far away, so more stars sit far than near.
 *
 * @param u - Uniform random number in [0, 1]
 */
export function sampleDepth(u: number, near: number, far: number): number {
  return Math.cbrt(near ** 3 + u * (far ** 3 - near ** 3));
}

/**
 * How much larger a star appears at a depth than it would at the far limit. Deliberately
 * gentler than true perspective, and capped, so near stars brighten and grow without ballooning.
 */
export function depthGrowth(depth: number, far: number): number {
  return Math.min(GROWTH_CAP, Math.pow(far / Math.max(depth, 1e-6), GROWTH_EXPONENT));
}

/** True when a camera-space point has left the star volume (frame plus margin, near to far). */
export function isOutsideVolume(
  x: number,
  y: number,
  depth: number,
  view: FrameView,
  near: number,
  far: number,
): boolean {
  return (
    depth < near ||
    depth > far ||
    Math.abs(x) > VOLUME_MARGIN * view.tanX * depth ||
    Math.abs(y) > VOLUME_MARGIN * view.tanY * depth
  );
}

/**
 * Rate at which stars flow into the volume through each of its six faces for a camera
 * velocity, in the order: far cap, near cap, right, left, top, bottom. Flying forward fills the
 * far cap; sliding sideways fills the upstream side; pulling back fills the sides and the near
 * cap. Only the proportions matter.
 *
 * @param velocity - Camera velocity in scene space (z negative = forward)
 */
export function inflowFlux(velocity: Vec3, view: FrameView, near: number, far: number): number[] {
  // Stars move opposite to the camera. `rd` is how fast their depth changes.
  const rx = -velocity.x;
  const ry = -velocity.y;
  const rd = velocity.z;
  const mx = VOLUME_MARGIN * view.tanX;
  const my = VOLUME_MARGIN * view.tanY;
  const span = far * far - near * near;
  return [
    Math.max(0, -rd) * 4 * mx * my * far * far,
    Math.max(0, rd) * 4 * mx * my * near * near,
    Math.max(0, -(rx - rd * mx)) * my * span,
    Math.max(0, -(-rx - rd * mx)) * my * span,
    Math.max(0, -(ry - rd * my)) * mx * span,
    Math.max(0, -(-ry - rd * my)) * mx * span,
  ];
}

/**
 * Picks where a recycled star re-enters: a face chosen in proportion to its inflow, then a
 * point spread evenly over that face. Stars entering through a side face start in the margin,
 * out of sight; those entering through the far or near cap are inside the frame and must fade in.
 *
 * @param flux - Result of {@link inflowFlux}
 * @param random - Source of uniform random numbers in [0, 1)
 */
export function sampleInflow(
  flux: readonly number[],
  view: FrameView,
  near: number,
  far: number,
  random: () => number,
): InflowPoint {
  const total = flux.reduce((sum, f) => sum + f, 0);
  let face = 0;
  if (total > 0) {
    let pick = random() * total;
    while (face < flux.length - 1 && pick > flux[face]) {
      pick -= flux[face];
      face++;
    }
  }
  const mx = VOLUME_MARGIN * view.tanX;
  const my = VOLUME_MARGIN * view.tanY;
  const spread = (): number => random() * 2 - 1;

  if (face <= 1) {
    const depth = face === 0 ? far * 0.999 : near * 1.001;
    return { x: spread() * mx * depth, y: spread() * my * depth, depth, fadeIn: true };
  }
  // A side face is wider far away, so entry depths are weighted toward the far end.
  const depth = Math.sqrt(near * near + random() * (far * far - near * near));
  if (face <= 3) {
    return { x: (face === 2 ? 1 : -1) * mx * depth * 0.999, y: spread() * my * depth, depth, fadeIn: false };
  }
  return { x: spread() * mx * depth, y: (face === 4 ? 1 : -1) * my * depth * 0.999, depth, fadeIn: false };
}
