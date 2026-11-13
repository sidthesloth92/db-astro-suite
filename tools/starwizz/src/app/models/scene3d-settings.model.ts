/** The two ways the 3D camera can move. */
export type Scene3dStyle = 'travel' | 'arrive';

/**
 * Where a Travel shot heads. The sideways names follow the 2D mode: "left" means the scene
 * drifts to the left of the frame. `custom` flies toward a point the user picks on the preview.
 */
export type Scene3dDirection = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'custom';

/** How the moving stars are drawn: the photo's own pixels, or redrawn crisp. */
export type StarStyle = 'original' | 'sharp';

/** Slider controls of the 3D mode. */
export type Scene3dControlKey =
  | 'speed'
  | 'cloudDepth'
  | 'starAmount'
  | 'starSize'
  | 'starDepth'
  | 'spikes'
  | 'twinkle';

/**
 * Where the 3D scene stands: nothing to show, lifting the stars off the photo, ready to play,
 * or failed (with a message for the user).
 */
export type Scene3dStatus = 'idle' | 'lifting' | 'ready' | 'error';

/** A point on the preview, as a fraction of the frame from its centre (x right, y down). */
export interface AimPoint {
  /** Horizontal offset in frame widths, -0.5 (left edge) to 0.5 (right edge). */
  x: number;
  /** Vertical offset in frame heights, -0.5 (top edge) to 0.5 (bottom edge). */
  y: number;
}

/** Snapshot of every 3D setting, read by the scene each frame. */
export interface Scene3dSettings {
  /** Travel or Arrive. */
  style: Scene3dStyle;
  /** Travel direction preset. */
  direction: Scene3dDirection;
  /** Point the camera flies toward when the direction is `custom`. */
  aim: AimPoint;
  /** Original or Sharp stars. */
  starStyle: StarStyle;
  /** Arrive: true = the camera really approaches; false = the frame holds and the cloud comes forward. */
  zoomIn: boolean;
  /** Arrive: fade the photo's stars back in once the camera has settled. */
  starsReturn: boolean;
  /** Speed slider value. */
  speed: number;
  /** Cloud Depth slider value. */
  cloudDepth: number;
  /** Star Amount slider value, in percent. */
  starAmount: number;
  /** Star Size slider value (multiplier). */
  starSize: number;
  /** Star Depth slider value. */
  starDepth: number;
  /** Spikes slider value. */
  spikes: number;
  /** Twinkle slider value. */
  twinkle: number;
}
