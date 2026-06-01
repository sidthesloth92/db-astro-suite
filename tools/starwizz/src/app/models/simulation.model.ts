export type RecordingState = 'idle' | 'recording' | 'processing';

export type ControlKey =
  | 'zoomRate'
  | 'rotationRate'
  | 'shootingStarSpeed'
  | 'starSpeed'
  | 'baseStarSize'
  | 'starCount';

/**
 * Direction the camera travels through the starfield. Depth directions
 * (`forward`/`backward`) drive both the star motion and the galaxy zoom;
 * lateral directions stream the stars with parallax and pan the galaxy.
 * `path` is the cinematic Custom Path mode where the camera glides between
 * two user-authored keyframes (A → B) instead of a fixed preset vector.
 */
export type TravelDirection =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'path';

/**
 * A single camera framing of the DSO image: a pan offset (in world px,
 * relative to centre) plus a zoom scale. Start (A) and End (B) keyframes of
 * a Custom Path are both `CameraKeyframe`s; the camera lerps between them.
 */
export interface CameraKeyframe {
  /** Horizontal pan offset of the galaxy backdrop, in world px. */
  panX: number;
  /** Vertical pan offset of the galaxy backdrop, in world px. */
  panY: number;
  /** Zoom scale (1 = image just covers the frame). */
  scale: number;
}

/**
 * Radial depth component of the star motion: `none` (flat), `out` (expand from
 * centre — zoom-in feel), or `in` (contract toward centre — zoom-out feel).
 */
export type StarDepth = 'none' | 'out' | 'in';

/**
 * Star-motion preset applied when a travel direction is selected: the radial
 * depth, the lateral drift angle (degrees), and whether lateral drift is active.
 */
export interface StarMotionDefaults {
  /** Radial depth component. */
  depth: StarDepth;
  /** Lateral drift angle in degrees (0 = right, 90 = up, 180 = left, 270 = down). */
  angleDeg: number;
  /** Whether lateral drift along `angleDeg` is active. */
  lateralOn: boolean;
}

export interface ControlMetadata {
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  precision: number;
  /** Optional multiplier to convert UI value to internal value (default: 1) */
  internalMultiplier?: number;
}
