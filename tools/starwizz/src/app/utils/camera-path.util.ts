import {
  AIM_LIMIT,
  ARRIVE_CLEAR_SPAN,
  ARRIVE_CLEAR_START,
  ARRIVE_HOLD_SECONDS,
  ARRIVE_REACH_HOLD,
  ARRIVE_REACH_ZOOM,
  ARRIVE_RETURN_SECONDS,
  ARRIVE_SECONDS_PER_SPEED,
  STAR_BACKDROP_GAP,
  CLOUD_DEPTH_PER_UNIT,
  LATERAL_CAMERA_HEADING,
  LATERAL_FORWARD_SHARE,
  LATERAL_OVERSCAN,
  ROTATION_RATE_PER_UNIT,
  SPEED_RATE_PER_UNIT,
  STAR_DEPTH_RATIO_BASE,
  STAR_DEPTH_RATIO_PER_UNIT,
  TRAVEL_MAX_ZOOM,
  TRAVEL_MIN_SECONDS,
} from '../constants/scene3d.constant';
import {
  ArrivePlan,
  FrameView,
  ScenePose,
  ShotFraming,
  TravelPlan,
  Vec3,
} from '../models/scene-pose.model';
import { Scene3dSettings } from '../models/scene3d-settings.model';

/** Smooth 0..1 ramp with zero slope at both ends; input is clamped. */
export function smoothStep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/** True for the Travel presets that slide the camera sideways. */
function isSideways(settings: Scene3dSettings): boolean {
  return (
    settings.style === 'travel' &&
    (settings.direction === 'left' ||
      settings.direction === 'right' ||
      settings.direction === 'up' ||
      settings.direction === 'down')
  );
}

/**
 * How much the backdrop is zoomed in at the start of a shot. Flying forward (or toward any
 * point inside the frame) only ever shows less of the photo, so it needs no spare room.
 * Sideways presets need room to slide. Turning the view does not change it.
 */
export function overscanFor(settings: Scene3dSettings): number {
  return isSideways(settings) ? LATERAL_OVERSCAN : 1;
}

/** How fast the picture turns on screen, in radians per second; positive is clockwise. */
export function turnRate(settings: Scene3dSettings): number {
  return settings.rotation * ROTATION_RATE_PER_UNIT;
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
  const spin = turnRate(settings);
  const shot = (start: Vec3, end: Vec3, duration: number): TravelPlan => ({
    start,
    end,
    duration,
    turn: spin * duration,
  });

  switch (settings.direction) {
    case 'forward':
      return shot(origin, { x: 0, y: 0, z: -reach }, reach / rate);

    case 'custom': {
      const ax = Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, settings.aim.x));
      const ay = Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, settings.aim.y));
      // Flying straight at a point on the backdrop keeps that point still on screen.
      const end = { x: reach * 2 * ax * view.tanX, y: -reach * 2 * ay * view.tanY, z: -reach };
      return shot(origin, end, reach / rate);
    }

    case 'backward': {
      // Start close and pull back to the resting view; the stars must fit in front of the camera.
      const back = Math.max(0.05, Math.min(reach, 1 - farDepth - STAR_BACKDROP_GAP));
      return shot({ x: 0, y: 0, z: -back }, origin, back / rate);
    }

    default: {
      const heading = LATERAL_CAMERA_HEADING[settings.direction];
      const horizontal = heading.x !== 0;
      const tan = horizontal ? view.tanX : view.tanY;
      // Spare backdrop on each side of the resting frame, in scene units.
      const margin = Math.max(0, (horizontal ? view.imageAspect / 2 : 0.5) - tan);
      const forward = LATERAL_FORWARD_SHARE * rate;
      // Sideways speed that slides the backdrop by `rate` frame-widths (or heights) per second.
      const wanted = rate * 2 * tan;
      // The leading frame edge closes on the photo's edge at (sideways - tan * forward).
      const untilEdge = wanted - tan * forward > 1e-9 ? (2 * margin) / (wanted - tan * forward) : Infinity;
      const duration = Math.max(TRAVEL_MIN_SECONDS, Math.min(untilEdge, reach / forward));
      // If the photo has too little room for even the shortest shot, slide more slowly so the
      // frame still stops at the photo's edge instead of running past it.
      const sideways = Math.min(wanted, (2 * margin) / duration + tan * forward);
      const closing = sideways - tan * forward;
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
      return shot(start, end, duration);
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

/**
 * Pose of a Travel shot at a progress of 0 (start) to 1 (end). The shot starts upright and
 * turns at a steady rate.
 */
export function travelPose(plan: TravelPlan, progress: number): ScenePose {
  const u = Math.min(1, Math.max(0, progress));
  return {
    position: {
      x: plan.start.x + (plan.end.x - plan.start.x) * u,
      y: plan.start.y + (plan.end.y - plan.start.y) * u,
      z: plan.start.z + (plan.end.z - plan.start.z) * u,
    },
    roll: plan.turn * u,
    tanScale: 1,
    starFade: 1,
    photoMix: 0,
  };
}

/** Plans an Arrive shot from the current settings. */
export function planArrive(settings: Scene3dSettings): ArrivePlan {
  const duration = ARRIVE_SECONDS_PER_SPEED / settings.speed;
  return {
    reach: settings.zoomIn ? ARRIVE_REACH_ZOOM : ARRIVE_REACH_HOLD,
    duration,
    hold: ARRIVE_HOLD_SECONDS,
    // Turning at the chosen rate and slowing steadily to a stop covers half of rate x time.
    turn: (turnRate(settings) * duration) / 2,
  };
}

/**
 * Pose of an Arrive shot. The camera eases in over the arrival; stragglers fade out just
 * before it settles; then, during the hold, the photo's own stars can fade back in.
 *
 * With Zoom In off the lens widens exactly as the camera advances, so the far backdrop keeps
 * its size and only the nearer parts of the cloud come forward.
 *
 * A turning view starts turned and turns back as it arrives, at the chosen rate at first and
 * slowing steadily, so it is upright when the camera settles and the photo's stars can return
 * where the photo has them.
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
    roll: 0 - plan.turn * (1 - u) ** 2,
    tanScale: settings.zoomIn ? 1 : 1 / (1 + z),
    starFade: 1 - smoothStep((u - ARRIVE_CLEAR_START) / ARRIVE_CLEAR_SPAN),
    photoMix: settings.starsReturn ? smoothStep(heldSeconds / ARRIVE_RETURN_SECONDS) : 0,
  };
}

/**
 * The lens widened to the upright box that holds the frame at every angle up to `turn` either
 * way. A frame turned a little needs a slightly larger box; one turned far enough needs a box
 * as wide and as tall as its own diagonal.
 *
 * @param turn - Furthest the frame turns from upright, in radians
 */
export function coverFor(view: FrameView, turn: number): FrameView {
  const angle = Math.abs(turn);
  const diagonal = Math.hypot(view.tanX, view.tanY);
  // Each side of the box grows with the angle until the frame's diagonal lies along it.
  const widest = Math.atan2(view.tanY, view.tanX);
  const tallest = Math.atan2(view.tanX, view.tanY);
  return {
    tanX: angle >= widest ? diagonal : view.tanX * Math.cos(angle) + view.tanY * Math.sin(angle),
    tanY: angle >= tallest ? diagonal : view.tanX * Math.sin(angle) + view.tanY * Math.cos(angle),
    imageAspect: view.imageAspect,
  };
}

/**
 * Frames a shot: its lens, the box its stars have to fill, and how far its frame reaches
 * across the photo.
 *
 * Turning the view never zooms the photo: the shot is framed exactly as it is with Rotation
 * off, and turns in place. A turning frame swings its corners outward, so the stars are given
 * the whole box it turns inside, and where a corner passes the edge of the photo the backdrop
 * carries on as a mirror image of it.
 *
 * @param imageAspect - Photo width / height
 * @param frameAspect - Output width / height
 * @param farDepth - Far limit of the star volume (see {@link starFarDepth})
 */
export function frameShot(
  settings: Scene3dSettings,
  imageAspect: number,
  frameAspect: number,
  farDepth: number,
): ShotFraming {
  const view = frameView(imageAspect, frameAspect, overscanFor(settings));
  if (settings.rotation === 0) {
    return { view, cover: view, reach: { x: 1, y: 1 } };
  }

  // How far the shot turns, and how far its camera strays from the middle of the photo.
  let turn: number;
  let aside = 0;
  let above = 0;
  if (settings.style === 'arrive') {
    turn = planArrive(settings).turn;
  } else {
    const plan = planTravel(settings, view, farDepth);
    turn = plan.turn;
    aside = Math.max(Math.abs(plan.start.x), Math.abs(plan.end.x));
    above = Math.max(Math.abs(plan.start.y), Math.abs(plan.end.y));
  }
  const cover = coverFor(view, turn);
  return {
    view,
    cover,
    reach: {
      x: Math.max(1, (aside + cover.tanX) / (imageAspect / 2)),
      y: Math.max(1, (above + cover.tanY) / 0.5),
    },
  };
}
