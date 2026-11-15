import { SegmentedTabOption, SelectItem } from '@db-astro-suite/ui';
import {
  AimPoint,
  Scene3dControlKey,
  Scene3dDirection,
  Scene3dStyle,
  StarStyle,
} from '../models/scene3d-settings.model';
import { ControlMetadata } from '../models/simulation.model';

// ==================== Controls ====================

/** Slider metadata for the 3D mode, in the same shape the 2D sliders use. */
export const SCENE3D_CONTROLS: Record<Scene3dControlKey, ControlMetadata> = {
  speed: {
    label: 'Speed',
    description:
      'How fast the camera moves. In Arrive it also sets how long the arrival takes: higher is quicker.',
    min: 1,
    max: 10,
    step: 0.5,
    initial: 4,
    precision: 1,
  },
  rotation: {
    label: 'Rotation',
    description:
      'Turns the view as the camera moves. Drag left of the middle to turn it anticlockwise, right to turn it clockwise. The further from the middle, the faster it turns. 0 is off. Where a corner of the frame swings past the edge of your image, the image carries on as a mirror of itself.',
    min: -10,
    max: 10,
    step: 1,
    initial: 0,
    precision: 0,
    origin: 0,
  },
  cloudDepth: {
    label: 'Cloud Depth',
    description:
      'How far the bright parts of the nebula stand out toward you. 0 keeps the nebula flat.',
    min: 0,
    max: 10,
    step: 1,
    initial: 6,
    precision: 0,
  },
  starAmount: {
    label: 'Star Amount',
    description:
      'How many stars fly past, as a share of the stars in your photo. Above 100 adds more stars like yours.',
    min: 50,
    max: 300,
    step: 10,
    initial: 100,
    precision: 0,
  },
  starSize: {
    label: 'Star Size',
    description: 'Overall size of the moving stars. 1 matches your photo.',
    min: 0.5,
    max: 3,
    step: 0.1,
    initial: 1,
    precision: 1,
  },
  starDepth: {
    label: 'Star Depth',
    description:
      'How far in front of the nebula the stars sit. Higher values bring them closer to you, so they sweep past faster and the 3D feels stronger.',
    min: 1,
    max: 10,
    step: 1,
    initial: 3,
    precision: 0,
  },
  spikes: {
    label: 'Spikes',
    description:
      'Four-point spikes on the brightest stars. 0 keeps every star round; higher values add spikes to more stars.',
    min: 0,
    max: 10,
    step: 1,
    initial: 5,
    precision: 0,
  },
  twinkle: {
    label: 'Twinkle',
    description: 'How strongly the stars shimmer. 0 keeps them steady.',
    min: 0,
    max: 10,
    step: 1,
    initial: 0,
    precision: 0,
  },
};

/** Options of the 2D | 3D mode switch. */
export const RENDER_MODE_OPTIONS: readonly SegmentedTabOption[] = [
  { id: '2d', label: '2D' },
  { id: '3d', label: '3D' },
];

/** Style options for the 3D Style select. */
export const SCENE3D_STYLE_OPTIONS: readonly SelectItem[] = [
  { label: 'Travel (fly through the stars)', value: 'travel' },
  { label: 'Arrive (settle on the object)', value: 'arrive' },
];

/** Direction options for Travel, mirroring the 2D presets. */
export const SCENE3D_DIRECTION_OPTIONS: readonly SelectItem[] = [
  { label: 'Forward (into scene)', value: 'forward' },
  { label: 'Backward (away)', value: 'backward' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
  { label: 'Custom (drag the marker)', value: 'custom' },
];


/** Shown when the photo cannot be prepared for 3D. */
export const SCENE3D_ERROR_PREPARE = 'This image could not be prepared for 3D. Try another image.';
/** Shown when the browser cannot draw the 3D scene at all. */
export const SCENE3D_ERROR_UNSUPPORTED =
  '3D mode needs WebGL2, which this browser does not provide. Switch back to 2D to keep going.';
/** Loading message while the stars are being lifted off the photo. */
export const SCENE3D_LIFTING_MESSAGE = 'Lifting stars...';
/** How far one arrow-key press moves the Custom aim marker, in frame fractions. */
export const AIM_KEY_STEP = 0.02;

/** Every 3D slider control, for resetting them together. */
export const SCENE3D_CONTROL_KEYS: readonly Scene3dControlKey[] = [
  'speed',
  'rotation',
  'cloudDepth',
  'starAmount',
  'starSize',
  'starDepth',
  'spikes',
  'twinkle',
];
/** How far one Shift + arrow-key press moves the Custom aim marker, in frame fractions. */
export const AIM_KEY_STEP_LARGE = 0.1;
/** Shown when the 3D scene's code fails to load. */
export const SCENE3D_ERROR_LOAD = '3D mode could not be loaded. Check your connection and try again.';

/** Style on first load and after Reset Params. */
export const DEFAULT_SCENE3D_STYLE: Scene3dStyle = 'travel';
/** Direction on first load and after Reset Params. */
export const DEFAULT_SCENE3D_DIRECTION: Scene3dDirection = 'left';
/** Star style on first load and after Reset Params. */
export const DEFAULT_STAR_STYLE: StarStyle = 'sharp';
/** Custom aim on first load and after Reset Params: the frame centre. */
export const DEFAULT_AIM: AimPoint = { x: 0, y: 0 };
/** Furthest the Custom aim marker can sit from the centre, in frame fractions. */
export const AIM_LIMIT = 0.5;

/**
 * Camera heading for each sideways preset, as (x, y) in scene space. The names describe which
 * way the scene drifts, matching the 2D mode, so the camera moves the opposite way.
 */
export const LATERAL_CAMERA_HEADING: Record<'left' | 'right' | 'up' | 'down', { x: number; y: number }> = {
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

// ==================== Camera ====================

/** Forward speed, as a fraction of the backdrop distance per second, per Speed unit. */
export const SPEED_RATE_PER_UNIT = 0.005;
/** A Travel shot restarts once the backdrop has grown by this factor. */
export const TRAVEL_MAX_ZOOM = 1.9;
/** Sideways presets start zoomed in by this factor so the backdrop has room to slide. */
export const LATERAL_OVERSCAN = 1.3;
/** Sideways presets also move forward at this share of the speed, which gives near stars life. */
export const LATERAL_FORWARD_SHARE = 0.5;
/** Shortest sideways shot (seconds); with less room than that the camera slides more slowly. */
export const TRAVEL_MIN_SECONDS = 3;
/** How fast the view turns, in radians per second, per Rotation unit (one degree a second). */
export const ROTATION_RATE_PER_UNIT = Math.PI / 180;
/** Moving stars always stay at least this far in front of the backdrop. */
export const STAR_BACKDROP_GAP = 0.03;

/** Arrival time is this many seconds divided by the Speed value. */
export const ARRIVE_SECONDS_PER_SPEED = 28;
/** How far Arrive flies in when Zoom In is on. */
export const ARRIVE_REACH_ZOOM = 0.38;
/** How far Arrive flies in when the frame holds (Zoom In off). */
export const ARRIVE_REACH_HOLD = 0.45;
/** Seconds resting on the object before Arrive restarts. */
export const ARRIVE_HOLD_SECONDS = 2.4;
/** Seconds over which the photo's stars fade back in after settling. */
export const ARRIVE_RETURN_SECONDS = 1.4;
/** Share of the arrival after which straggling stars start to fade. */
export const ARRIVE_CLEAR_START = 0.78;
/** Share of the arrival over which stragglers fade out. */
export const ARRIVE_CLEAR_SPAN = 0.16;

/**
 * Longest step (seconds) one frame may advance the shot. The shot runs in real time, so a slow
 * device drops frames instead of playing in slow motion; this cap only stops a tab that was in
 * the background from leaping ahead when it returns.
 */
export const MAX_FRAME_SECONDS = 0.25;

/** Nebula relief per Cloud Depth unit (fraction of the backdrop distance). */
export const CLOUD_DEPTH_PER_UNIT = 0.04;

// ==================== Star volume ====================

/** The slowest stars move this many times faster than the backdrop at Star Depth 0... */
export const STAR_DEPTH_RATIO_BASE = 1;
/** ...plus this much per Star Depth unit. The stars' far limit is 1 / ratio. */
export const STAR_DEPTH_RATIO_PER_UNIT = 0.2;
/** Nearest a Travel star may come before it is recycled (fraction of the backdrop distance). */
export const VOLUME_NEAR = 0.035;
/** Nearest an Arrive star may come before it is hidden. */
export const ARRIVE_VOLUME_NEAR = 0.02;
/** The star volume is this much wider than the frame, so stars enter and leave unseen. */
export const VOLUME_MARGIN = 1.18;
/** A star's on-screen size grows with nearness to this power (1 would be true perspective). */
export const GROWTH_EXPONENT = 0.5;
/** ...and never beyond this multiple of its size at the far limit. */
export const GROWTH_CAP = 3;
/** How strongly brightness decides depth: 1 = brightest always nearest, 0 = random. */
export const DEPTH_RANK_WEIGHT = 0.7;
/** Seconds a star takes to fade in when it appears inside the frame. */
export const STAR_FADE_IN_SECONDS = 1.2;

// ==================== Sharp stars ====================

/** Sharp stars are drawn on a quad this many half-widths across. */
export const SHARP_EXTENT = 8;
/** Quad extent of a spiked star at spike strength 0... */
export const SPIKE_EXTENT_BASE = 9;
/** ...growing by this much at full strength. */
export const SPIKE_EXTENT_RANGE = 16;
/** Share of stars that get spikes, per Spikes unit. */
export const SPIKE_FRACTION_PER_UNIT = 0.0015;
/** Spike strength of the faintest spiked star. */
export const SPIKE_MIN_STRENGTH = 0.35;
/** Sharp stars are never drawn narrower than this many output px; they dim instead. */
export const SHARP_MIN_SCREEN_PX = 0.62;
/** Quad extent of the spike drawn on a giant star, in half-widths. */
export const GIANT_SPIKE_EXTENT = 25;
/** Half-width of a giant star's spike, as a fraction of its core radius. */
export const GIANT_SPIKE_WIDTH_FACTOR = 0.55;
/** Narrowest half-width (px) for a giant star's spike. */
export const GIANT_SPIKE_MIN_WIDTH = 1.2;
/** Brightness of a giant star's spike. */
export const GIANT_SPIKE_AMP = 0.9;

// ==================== Renderer ====================

/** Grid segments across the longer side of the backdrop mesh. */
export const BACKDROP_GRID_SEGMENTS = 160;
/** Near clipping distance of the scene. */
export const SCENE_NEAR = 0.002;
/** Far clipping distance of the scene. */
export const SCENE_FAR = 20;
/** Floats per star that change every frame: x, y, z, half width, half height, alpha. */
export const STAR_DYNAMIC_STRIDE = 6;
/** Floats per star that are fixed: atlas u0, v0, u1, v1, r, g, b, amp, spike, extent, kind. */
export const STAR_STATIC_STRIDE = 11;
/** Floats per star pinned to the backdrop: u, v, depth-map value, half-size, returns-with-photo. */
export const PINNED_STRIDE = 5;
/** Seed for the scene's random numbers, so a photo always produces the same star layout. */
export const SCENE_SEED = 11;
