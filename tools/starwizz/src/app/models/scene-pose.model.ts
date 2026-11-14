/** A point or velocity in scene space: x right, y up, z toward the viewer. */
export interface Vec3 {
  /** Horizontal component. */
  x: number;
  /** Vertical component (up is positive). */
  y: number;
  /** Depth component (the backdrop sits at z = -1, the resting camera at 0). */
  z: number;
}

/**
 * How the frame sees the backdrop at rest. The backdrop is a plane one unit away, one unit
 * tall and `imageAspect` wide; the tangents are the half-angles of the resting lens.
 */
export interface FrameView {
  /** Tangent of the horizontal half field of view. */
  tanX: number;
  /** Tangent of the vertical half field of view. */
  tanY: number;
  /** Photo width divided by height. */
  imageAspect: number;
}

/** Where the camera is and how the scene should be shown at one instant. */
export interface ScenePose {
  /** Camera position. */
  position: Vec3;
  /** How far the picture is turned on screen, in radians; positive is clockwise. */
  roll: number;
  /** Lens widening factor (1 = resting lens). Above 1 the lens is wider, as in a dolly zoom. */
  tanScale: number;
  /** Opacity multiplier for the moving stars, 0..1 (Arrive fades stragglers before settling). */
  starFade: number;
  /** How much of the original photo is mixed back over the starless backdrop, 0..1. */
  photoMix: number;
}

/** A straight Travel shot: where the camera starts, where it ends and how long it takes. */
export interface TravelPlan {
  /** Camera position at the start of the shot. */
  start: Vec3;
  /** Camera position at the end of the shot. */
  end: Vec3;
  /** Seconds from start to end at the current speed. */
  duration: number;
  /** How far the picture turns over the shot, in radians; positive is clockwise. */
  turn: number;
}

/** An Arrive shot: how far the camera flies in, how long it takes and how long it rests. */
export interface ArrivePlan {
  /** Distance flown toward the backdrop (the backdrop is 1 away). */
  reach: number;
  /** Seconds from start to settling on the object. */
  duration: number;
  /** Seconds resting on the object before the shot restarts. */
  hold: number;
  /**
   * How far the picture is turned at the start, in radians. It turns back upright as the
   * camera arrives; positive means it turns clockwise on the way.
   */
  turn: number;
}

/** How far something reaches across the photo, measured from its centre. */
export interface PhotoReach {
  /** Reach sideways, as a multiple of the photo's half-width (1 = its left or right edge). */
  x: number;
  /** Reach up and down, as a multiple of the photo's half-height (1 = its top or bottom edge). */
  y: number;
}

/** How a shot is framed: the lens it is seen through, and the room its turning frame needs. */
export interface ShotFraming {
  /** The resting lens. Turning the view never changes it: the photo is not zoomed. */
  view: FrameView;
  /**
   * The lens widened to the upright box that holds the frame at every angle it turns through.
   * The same as {@link view} when the view does not turn.
   */
  cover: FrameView;
  /**
   * How far the corners of the turning frame can reach across the photo. Above 1 they swing
   * past its edge, where the backdrop carries on as a mirror image of the photo.
   */
  reach: PhotoReach;
}

/** A point where a recycled star re-enters the view volume, in camera space. */
export interface InflowPoint {
  /** Offset to the right of the camera. */
  x: number;
  /** Offset above the camera. */
  y: number;
  /** Distance ahead of the camera. */
  depth: number;
  /** True when the point is inside the visible frame, so the star must fade in. */
  fadeIn: boolean;
}
