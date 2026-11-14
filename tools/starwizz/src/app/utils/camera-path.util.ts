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
  COVER_SAMPLES,
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
 * How much the backdrop is zoomed in at the start of a shot that does not turn. Flying forward
 * (or toward any point inside the frame) only ever shows less of the photo, so it needs no
 * spare room. Sideways presets need room to slide. A turning view needs more: see
 * {@link frameShot}.
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
 * @param cover - The box a sideways shot must keep on the photo: the frame itself, or the
 *   larger box a turning frame needs (see {@link frameShot})
 */
export function planTravel(
  settings: Scene3dSettings,
  view: FrameView,
  farDepth: number,
  cover: FrameView = view,
): TravelPlan {
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
      // What has to stay on the photo: the frame, or the larger box it turns inside.
      const box = horizontal ? cover.tanX : cover.tanY;
      // Spare backdrop on each side of that box at rest, in scene units.
      const margin = Math.max(0, (horizontal ? view.imageAspect / 2 : 0.5) - box);
      const forward = LATERAL_FORWARD_SHARE * rate;
      // Sideways speed that slides the backdrop by `rate` frame-widths (or heights) per second.
      const wanted = rate * 2 * tan;
      // The box's leading edge closes on the photo's edge at (sideways - box * forward).
      const untilEdge = wanted - box * forward > 1e-9 ? (2 * margin) / (wanted - box * forward) : Infinity;
      const duration = Math.max(TRAVEL_MIN_SECONDS, Math.min(untilEdge, reach / forward));
      // If the photo has too little room for even the shortest shot, slide more slowly so the
      // frame still stops at the photo's edge instead of running past it.
      const sideways = Math.min(wanted, (2 * margin) / duration + box * forward);
      const closing = sideways - box * forward;
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
 * How far a shot's frame reaches toward the edge of the photo at its worst moment: 1 means a
 * corner just touches the edge, above 1 means it would show past it by that factor.
 *
 * @param poseAt - The shot's pose at a progress of 0 (start) to 1 (end)
 */
export function shotReach(view: FrameView, poseAt: (progress: number) => ScenePose): number {
  let worst = 0;
  for (let i = 0; i <= COVER_SAMPLES; i++) {
    const pose = poseAt(i / COVER_SAMPLES);
    // The frame's footprint on the backdrop shrinks as the camera closes in.
    const size = (1 + pose.position.z) * pose.tanScale;
    const cos = Math.abs(Math.cos(pose.roll));
    const sin = Math.abs(Math.sin(pose.roll));
    const reachX = Math.abs(pose.position.x) + size * (view.tanX * cos + view.tanY * sin);
    const reachY = Math.abs(pose.position.y) + size * (view.tanX * sin + view.tanY * cos);
    worst = Math.max(worst, reachX / (view.imageAspect / 2), reachY / 0.5);
  }
  return worst;
}

/**
 * Frames a shot: the lens, zoomed in as far as the shot needs so the photo fills the frame
 * from the first moment to the last, and the box its stars have to fill.
 *
 * A view that does not turn needs only the room {@link overscanFor} gives it. A turning frame
 * swings its corners outward, so the photo is zoomed in just enough to keep them covered: a
 * slow turn needs little, a fast one more, and a camera flying forward needs less because it
 * sees less of the photo as it goes.
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
  const base = overscanFor(settings);
  if (settings.rotation === 0) {
    const view = frameView(imageAspect, frameAspect, base);
    return { view, cover: view };
  }

  // Worked out on the photo fitted to the frame: everything scales with the zoom from there.
  const fitted = frameView(imageAspect, frameAspect, 1);
  let overscan: number;
  let turn: number;
  if (settings.style === 'arrive') {
    const plan = planArrive(settings);
    turn = plan.turn;
    overscan = shotReach(fitted, (progress) => arrivePose(plan, progress, 0, settings));
  } else if (isSideways(settings)) {
    // A sideways shot is planned from the room it has, so its length is not known yet: allow
    // for the longest it can be, and keep the whole box it turns inside on the photo.
    const forward = LATERAL_FORWARD_SHARE * settings.speed * SPEED_RATE_PER_UNIT;
    const longest = Math.max(TRAVEL_MIN_SECONDS, (1 - 1 / TRAVEL_MAX_ZOOM) / forward);
    turn = turnRate(settings) * longest;
    const box = coverFor(fitted, turn);
    overscan = base * Math.max(box.tanX / (imageAspect / 2), box.tanY / 0.5);
  } else {
    const plan = planTravel(settings, fitted, farDepth);
    turn = plan.turn;
    overscan = shotReach(fitted, (progress) => travelPose(plan, progress));
  }
  const view = frameView(imageAspect, frameAspect, Math.max(base, overscan));
  return { view, cover: coverFor(view, turn) };
}
