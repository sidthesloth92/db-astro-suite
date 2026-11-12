import { LATERAL_TRAVEL_FRACTION, MIN_SCALE } from '../constants/simulation.constant';
import { LateralGlide } from '../models/lateral-glide.model';
import { CameraKeyframe } from '../models/simulation.model';

/**
 * Plans the backdrop glide for a lateral travel preset. The backdrop is drawn
 * "cover fit", so one axis has no spare image to pan across. This picks the
 * smallest zoom that leaves {@link LATERAL_TRAVEL_FRACTION} of the frame as
 * travel room along the travel axis (no extra zoom when the image already
 * overhangs the frame by that much).
 *
 * @param direction - Unit travel vector (only its non-zero axis is used)
 * @param frame - Output frame size in px
 * @param image - Natural size of the backdrop image in px
 * @returns The zoom to hold and the on-screen distance to travel per loop
 */
export function computeLateralGlide(
  direction: { x: number; y: number },
  frame: { width: number; height: number },
  image: { width: number; height: number },
): LateralGlide {
  const coverFit = Math.max(frame.width / image.width, frame.height / image.height);
  const isHorizontal = direction.x !== 0;
  const frameLength = isHorizontal ? frame.width : frame.height;
  const drawnLength = (isHorizontal ? image.width : image.height) * coverFit;
  if (!(frameLength > 0) || !(drawnLength > 0)) {
    return { scale: MIN_SCALE, travel: 0 };
  }

  const travel = frameLength * LATERAL_TRAVEL_FRACTION;
  // On screen the backdrop spans `drawnLength * scale`, so it can slide by
  // `drawnLength * scale - frameLength` before an edge would show.
  const scale = Math.max(MIN_SCALE, (frameLength + travel) / drawnLength);
  return { scale, travel };
}

/**
 * Resolves the backdrop framing at a point along a lateral glide. The glide is
 * centred on the image: it starts half the travel "behind" the centre and ends
 * half the travel past it, moving the backdrop the same way the stars stream.
 *
 * @param direction - Unit travel vector the backdrop moves along
 * @param glide - The planned glide (see {@link computeLateralGlide})
 * @param travelled - On-screen px travelled so far in the current loop
 * @returns The backdrop pan (world px) and zoom to render this frame
 */
export function lateralGlideFrame(
  direction: { x: number; y: number },
  glide: LateralGlide,
  travelled: number,
): CameraKeyframe {
  const progress = Math.max(0, Math.min(glide.travel, travelled));
  // Pan is applied inside the zoom transform, so convert screen px to world px.
  const offset = (progress - glide.travel / 2) / glide.scale;
  return { panX: direction.x * offset, panY: direction.y * offset, scale: glide.scale };
}
