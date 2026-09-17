import { SelectItem } from '@db-astro-suite/ui';
import {
  ControlKey,
  ControlMetadata,
  StarMotionDefaults,
  TravelDirection,
} from '../models/simulation.model';

export const CANVAS_DIMENSIONS = {
  width: 1080,
  height: 1920,
};

export const DEFAULT_GALAXY_URL = 'Chrismas_Tree_HOO_16_9_full.jpg';

export const FORMATS = {
  reels: { width: 1080, height: 1920, label: '9:16 · Reels · 1080×1920' },
  'instagram-portrait': { width: 1080, height: 1350, label: '4:5 · Portrait · 1080×1350' },
  'instagram-post': { width: 1080, height: 1080, label: '1:1 · Square · 1080×1080' },
  tiktok: { width: 1080, height: 1920, label: '9:16 · 1080×1920' },
  shorts: { width: 1080, height: 1920, label: '9:16 · Shorts · 1080×1920' },
  'youtube-720p': { width: 1280, height: 720, label: '16:9 · 720p · 1280×720' },
  'youtube-1080p': { width: 1920, height: 1080, label: '16:9 · 1080p · 1920×1080' },
  'youtube-4k': { width: 3840, height: 2160, label: '16:9 · 4K · 3840×2160' },
  snapchat: { width: 1080, height: 1920, label: '9:16 · 1080×1920' },
};

export type FormatKey = keyof typeof FORMATS;

/** Default output format applied on first load and on a full reset (image clear). */
export const DEFAULT_FORMAT: FormatKey = 'reels';

/**
 * Format keys grouped by social-media platform, in dropdown render order.
 * Each platform becomes an `<optgroup>` header; nested keys map to options
 * that read out of `FORMATS` for their label and value.
 */
export const FORMAT_GROUPS: readonly { label: string; keys: readonly FormatKey[] }[] = [
  { label: 'Instagram', keys: ['reels', 'instagram-portrait', 'instagram-post'] },
  { label: 'TikTok', keys: ['tiktok'] },
  { label: 'YouTube', keys: ['shorts', 'youtube-720p', 'youtube-1080p', 'youtube-4k'] },
  { label: 'Snapchat', keys: ['snapchat'] },
];

export const CONTROLS: Record<ControlKey, ControlMetadata> = {
  zoomRate: {
    label: 'Zoom Speed',
    description:
      'Controls how fast the camera zooms into the background. Higher values create a faster, more dramatic zoom.',
    min: 1,
    max: 30,
    step: 1,
    initial: 2,
    precision: 0,
    internalMultiplier: 0.0001,
  },
  rotationRate: {
    label: 'Rotation Speed',
    description:
      'Controls how fast the scene rotates. Higher values create a spinning vortex effect.',
    min: 1,
    max: 25,
    step: 1,
    initial: 3,
    precision: 0,
    internalMultiplier: 0.00005,
  },
  shootingStarSpeed: {
    label: 'Shooting Star Speed',
    description:
      'How fast shooting stars streak, as a multiple of the background star speed — so they always travel in the same direction as the stars, just faster.',
    min: 1,
    max: 8,
    step: 0.5,
    initial: 3,
    precision: 1,
  },
  starSpeed: {
    label: 'Star Speed',
    description: 'Controls the movement speed of background stars that create depth.',
    min: 0.5,
    max: 10,
    step: 0.5,
    initial: 4,
    precision: 1,
    // Slider 5 maps to the previous sweet-spot internal speed of 0.6 (0.6 / 5),
    // giving symmetric headroom to speed up (→10) or slow down (→0.5).
    internalMultiplier: 0.12,
  },
  baseStarSize: {
    label: 'Star Size Multiplier',
    description: 'Controls the overall size of all stars in the simulation.',
    min: 1,
    max: 40,
    step: 0.5,
    initial: 10,
    precision: 1,
  },
  starCount: {
    label: 'Star Count',
    description:
      'Controls how many background stars are generated. Higher values create a denser starfield.',
    min: 500,
    max: 2000,
    step: 100,
    initial: 1000,
    precision: 0,
  },
  starColorIntensity: {
    label: 'Star Color Intensity',
    description:
      'Controls how saturated the star colours are. 1 is a light pastel wash, 3 is the natural default, and higher values push the tints into deep, vivid saturation.',
    min: 1,
    max: 10,
    step: 1,
    initial: 4,
    precision: 0,
  },
  colorfulStarRatio: {
    label: 'Colorful Stars',
    description:
      'Controls how many stars get a colour other than white. 1 keeps the field mostly white; higher values trade white stars for blue, yellow and orange ones.',
    min: 1,
    max: 10,
    step: 1,
    initial: 4,
    precision: 0,
  },
  twinkleStrength: {
    label: 'Star Twinkle',
    description:
      'Controls how strongly stars shimmer. 0 disables the twinkle, 1–3 gives a subtle shimmer that survives video export cleanly, and higher values make stars pulse dramatically — at 10 they blink in and out.',
    min: 0,
    max: 10,
    step: 1,
    initial: 6,
    precision: 0,
  },
  spikeAmount: {
    label: 'Diffraction Spikes',
    description:
      'Controls the four-point spikes on bright stars: how many stars get them and how long and bright the arms grow. 0 disables spikes; at 10 most stars carry prominent crosses.',
    min: 0,
    max: 10,
    step: 1,
    initial: 7,
    precision: 0,
  },
};

/**
 * Camera/scene slider controls, in render order. These shape the galaxy backdrop
 * motion and stay visible regardless of the master Stars switch.
 */
export const CAMERA_CONTROL_KEYS: readonly ControlKey[] = ['zoomRate', 'rotationRate'];

/**
 * Background-starfield slider controls, in render order. These live inside the
 * "Stars" section and are hidden when the master Stars switch is off.
 * (`shootingStarSpeed` is rendered separately, next to the Shooting Stars toggle.)
 */
export const STAR_FIELD_CONTROL_KEYS: readonly ControlKey[] = [
  'starSpeed',
  'baseStarSize',
  'starCount',
  'starColorIntensity',
  'colorfulStarRatio',
  'spikeAmount',
  'twinkleStrength',
];

/**
 * Per-direction unit velocity applied to each star (and to the galaxy pan).
 * `z` is depth (negative = toward the viewer), `x`/`y` are lateral world axes.
 */
export const DIRECTION_VECTORS: Record<TravelDirection, { x: number; y: number; z: number }> = {
  forward: { x: 0, y: 0, z: -1 },
  backward: { x: 0, y: 0, z: 1 },
  left: { x: -1, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: -1, z: 0 },
  down: { x: 0, y: 1, z: 0 },
  // Custom Path carries no preset vector — star motion comes from the path.
  path: { x: 0, y: 0, z: 0 },
};

/** Lower bound of the galaxy zoom ramp (upper bound `TARGET_SCALE` lives in the simulator). */
export const MIN_SCALE = 1.0;

/**
 * Nominal animation frame rate. Used to convert the per-second Custom Path speed
 * into a per-frame star step so the field's pace tracks the camera glide (star
 * motion is applied per frame, the camera glide per second).
 */
export const ASSUMED_FPS = 60;

/**
 * In a fixed Custom Path the star field drifts at this multiple of the camera's
 * per-frame path pace, so it tracks the glide (no longer stalling at the fixed
 * Star Speed) while staying a touch slower than the backdrop pan rather than
 * outrunning it. The Star Speed slider scales this as a relative multiplier.
 */
export const PATH_STAR_SPEED_FACTOR = 0.6;

/**
 * Multiplier applied to lateral star drift. Matched to {@link STAR_DEPTH_FACTOR}
 * so lateral and depth motion move at the same per-frame speed — Star Speed 5
 * stays the original calibrated "normal" feel, and combined zoom+pan paths show
 * both components equally instead of the pan swamping the depth.
 */
export const STAR_LATERAL_FACTOR = 1;

/**
 * Multiplier applied to the radial depth (in/out) star motion. Kept at 1 so the
 * depth speed matches the original calibrated feel (the Star Speed slider value
 * maps directly to the per-frame z step).
 */
export const STAR_DEPTH_FACTOR = 1;

/**
 * Galaxy (DSO) lateral pan factor, applied to `starSpeed`. Kept far below
 * {@link STAR_LATERAL_FACTOR} so the backdrop is by far the slowest-moving
 * layer — a deep, distant object that only creeps while the stars stream past
 * it, giving a strong parallax depth cue without racing to the overscan edge.
 */
export const GALAXY_PAN_FACTOR = 0.15;

/** Travel-direction options for the control-panel select. */
export const DIRECTION_OPTIONS: readonly SelectItem[] = [
  { label: 'Forward (into scene)', value: 'forward' },
  { label: 'Backward (away)', value: 'backward' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
  { label: 'Custom Path (A→B)', value: 'path' },
];

/**
 * Star-motion defaults applied when each travel direction is selected. The
 * lateral angle uses 0 = right, 90 = up, 180 = left, 270 = down. Forward/Backward
 * are pure depth (no lateral drift); `path` is a placeholder overridden from the
 * actual A→B framing when the path is set.
 */
export const DIRECTION_STAR_DEFAULTS: Record<TravelDirection, StarMotionDefaults> = {
  forward: { depth: 'out', angleDeg: 0, lateralOn: false },
  backward: { depth: 'in', angleDeg: 0, lateralOn: false },
  right: { depth: 'none', angleDeg: 0, lateralOn: true },
  left: { depth: 'none', angleDeg: 180, lateralOn: true },
  up: { depth: 'none', angleDeg: 90, lateralOn: true },
  down: { depth: 'none', angleDeg: 270, lateralOn: true },
  // Custom Path starts off (no motion) until derived from the A→B framing.
  path: { depth: 'none', angleDeg: 0, lateralOn: false },
};

/** Sideways-drift angle slider bounds/step (degrees). */
export const STAR_ANGLE_MIN = 0;
export const STAR_ANGLE_MAX = 360;
export const STAR_ANGLE_STEP = 5;

// ==================== Custom Path (A→B) tunables ====================

/** Maximum zoom scale reachable by the path zoom slider / wheel. */
export const MAX_ZOOM = 5;

/** Travel-speed bounds for a Custom Path glide, in world px per second. */
export const PATH_SPEED_MIN = 20;
export const PATH_SPEED_MAX = 800;
export const PATH_SPEED_STEP = 10;
export const PATH_SPEED_DEFAULT = 150;

/** A→B duration bounds (seconds) used by the linked Speed ⇄ Duration fields. */
export const PATH_DURATION_MIN = 0.5;
export const PATH_DURATION_MAX = 30;

/**
 * Weight applied to the zoom (scale) difference when measuring the A→B
 * "distance" for the Speed ⇄ Duration link, converting a unit of scale into
 * comparable world-px so a pure zoom move still has a sensible duration.
 */
export const PATH_SCALE_DISTANCE_WEIGHT = 600;
