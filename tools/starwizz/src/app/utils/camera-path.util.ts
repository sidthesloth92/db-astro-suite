import {
  AIM_LIMIT,
  ARRIVE_CLEAR_SPAN,
  ARRIVE_CLEAR_START,
  ARRIVE_HOLD_SECONDS,
  ARRIVE_REACH_HOLD,
  ARRIVE_REACH_ZOOM,
  ARRIVE_RETURN_SECONDS,
  ARRIVE_SECONDS_PER_SPEED,
  BACKWARD_BACKDROP_GAP,
  CLOUD_DEPTH_PER_UNIT,
  LATERAL_CAMERA_HEADING,
  LATERAL_FORWARD_SHARE,
  LATERAL_OVERSCAN,
  SPEED_RATE_PER_UNIT,
  STAR_DEPTH_RATIO_BASE,
  STAR_DEPTH_RATIO_PER_UNIT,
  TRAVEL_MAX_ZOOM,
  TRAVEL_MIN_SECONDS,
} from '../constants/scene3d.constant';
import { ArrivePlan, FrameView, ScenePose, TravelPlan, Vec3 } from '../models/scene-pose.model';
import { Scene3dSettings } from '../models/scene3d-settings.model';

/** Smooth 0..1 ramp with zero slope at both ends; input is clamped. */
export function smoothStep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/**
 * How much the backdrop is zoomed in at the start of a shot. Flying forward (or toward any
 * point inside the frame) only ever shows less of the photo, so it needs no spare room.
 * Sideways presets need room to slide.
 */
export function overscanFor(settings: Scene3dSettings): number {
  const sideways =
    settings.style === 'travel' &&
    (settings.direction === 'left' ||
      settings.direction === 'right' ||
      settings.direction === 'up' ||
      settings.direction === 'down');
  return sideways ? LATERAL_OVERSCAN : 1;
}

/**
 * The resting lens: the photo covers the frame (like CSS `cover`), then is zoomed in by the
 * overscan.
 *
 * @param imageAspect - Photo width / height
 * @param frameAspect - Output width / height
 */
export function frameView(imageAspect: number, frameAspect: number, overscan: number): FrameView {
  const visibleHeight =
    imageAspect >= frameAspect ? 1 / overscan : imageAspect / (frameAspect * overscan);
  const tanY = visibleHeight / 2;
  return { tanX: tanY * frameAspect, tanY, imageAspect };
}

/** Far limit of the star volume for a Star Depth value, as a fraction of the backdrop distance. */
export function starFarDepth(starDepth: number): number {
  return 1 / (STAR_DEPTH_RATIO_BASE + STAR_DEPTH_RATIO_PER_UNIT * starDepth);
}

/** Nebula relief (fraction of the backdrop distance) for a Cloud Depth value. */
export function reliefFor(cloudDepth: number): number {
  return cloudDepth * CLOUD_DEPTH_PER_UNIT;
}

/**
 * Plans a Travel shot: a straight camera move at constant speed that never shows past the edge
 * of the photo and never zooms the backdrop beyond `TRAVEL_MAX_ZOOM`.
 *
 * @param farDepth - Far limit of the star volume (see {@link starFarDepth})
 */
export function planTravel(settings: Scene3dSettings, view: FrameView, farDepth: number): TravelPlan {
  const rate = settings.speed * SPEED_RATE_PER_UNIT;
  const reach = 1 - 1 / TRAVEL_MAX_ZOOM;
  const origin: Vec3 = { x: 0, y: 0, z: 0 };

  switch (settings.direction) {
    case 'forward':
      return { start: origin, end: { x: 0, y: 0, z: -reach }, duration: reach / rate };

    case 'custom': {
      const ax = Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, settings.aim.x));
      const ay = Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, settings.aim.y));
      // Flying straight at a point on the backdrop keeps that point still on screen.
      const end = { x: reach * 2 * ax * view.tanX, y: -reach * 2 * ay * view.tanY, z: -reach };
      return { start: origin, end, duration: reach / rate };
    }

    case 'backward': {
      // Start close and pull back to the resting view; the stars must fit in front of the camera.
      const back = Math.max(0.05, Math.min(reach, 1 - farDepth - BACKWARD_BACKDROP_GAP));
      return { start: { x: 0, y: 0, z: -back }, end: origin, duration: back / rate };
    }

    default: {
      const heading = LATERAL_CAMERA_HEADING[settings.direction];
      const horizontal = heading.x !== 0;
      const tan = horizontal ? view.tanX : view.tanY;
      // Spare backdrop on each side of the resting frame, in scene units.
      const margin = Math.max(0, (horizontal ? view.imageAspect / 2 : 0.5) - tan);
      const forward = LATERAL_FORWARD_SHARE * rate;
      // Sideways speed that slides the backdrop by `rate` frame-widths (or heights) per second.
      const sideways = rate * 2 * tan;
      // The leading frame edge closes on the photo's edge at (sideways - tan * forward).
      const closing = sideways - tan * forward;
      const untilEdge = closing > 1e-9 ? (2 * margin) / closing : Infinity;
      const duration = Math.max(TRAVEL_MIN_SECONDS, Math.min(untilEdge, reach / forward));
      const sign = horizontal ? heading.x : heading.y;
      // Start far enough to one side that the frame's leading edge meets the photo's edge at
      // the end of the shot, and no further, so short shots stay centred.
      const half = Math.min(margin, (Math.max(0, closing) * duration) / 2);
      const travelled = sign * sideways * duration;
      const start = horizontal ? { x: -sign * half, y: 0, z: 0 } : { x: 0, y: -sign * half, z: 0 };
      const end = {
        x: start.x + (horizontal ? travelled : 0),
        y: start.y + (horizontal ? 0 : travelled),
        z: -forward * duration,
      };
      return { start, end, duration };
    }
  }
}

/** Camera velocity of a Travel plan, in scene units per second. */
export function travelVelocity(plan: TravelPlan): Vec3 {
  return {
    x: (plan.end.x - plan.start.x) / plan.duration,
    y: (plan.end.y - plan.start.y) / plan.duration,
    z: (plan.end.z - plan.start.z) / plan.duration,
  };
}

/** Pose of a Travel shot at a progress of 0 (start) to 1 (end). */
export function travelPose(plan: TravelPlan, progress: number): ScenePose {
  const u = Math.min(1, Math.max(0, progress));
  return {
    position: {
      x: plan.start.x + (plan.end.x - plan.start.x) * u,
      y: plan.start.y + (plan.end.y - plan.start.y) * u,
      z: plan.start.z + (plan.end.z - plan.start.z) * u,
    },
    tanScale: 1,
    starFade: 1,
    photoMix: 0,
  };
}

/** Plans an Arrive shot from the current settings. */
export function planArrive(settings: Scene3dSettings): ArrivePlan {
  return {
    reach: settings.zoomIn ? ARRIVE_REACH_ZOOM : ARRIVE_REACH_HOLD,
    duration: ARRIVE_SECONDS_PER_SPEED / settings.speed,
    hold: ARRIVE_HOLD_SECONDS,
  };
}

/**
 * Pose of an Arrive shot. The camera eases in over the arrival; stragglers fade out just
 * before it settles; then, during the hold, the photo's own stars can fade back in.
 *
 * With Zoom In off the lens widens exactly as the camera advances, so the far backdrop keeps
 * its size and only the nearer parts of the cloud come forward.
 *
 * @param progress - 0 (start) to 1 (settled)
 * @param heldSeconds - Seconds spent resting since settling (0 while still arriving)
 */
export function arrivePose(
  plan: ArrivePlan,
  progress: number,
  heldSeconds: number,
  settings: Scene3dSettings,
): ScenePose {
  const u = Math.min(1, Math.max(0, progress));
  const z = -plan.reach * smoothStep(u);
  return {
    position: { x: 0, y: 0, z },
    tanScale: settings.zoomIn ? 1 : 1 / (1 + z),
    starFade: 1 - smoothStep((u - ARRIVE_CLEAR_START) / ARRIVE_CLEAR_SPAN),
    photoMix: settings.starsReturn ? smoothStep(heldSeconds / ARRIVE_RETURN_SECONDS) : 0,
  };
}
