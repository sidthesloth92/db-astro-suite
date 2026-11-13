/** Number of past positions drawn behind a shooting star as its fading trail. */
export const SHOOTING_STAR_TRAIL_LENGTH = 8;

/**
 * Projected spawn spread (fraction of the frame) for approaching ('out')
 * streaks: they start near the centre and flare outward as they near the
 * camera, so a tight spawn reads as a clean burst from the vanishing point.
 */
export const SHOOTING_STAR_CENTER_SPAWN_RATIO = 0.3;

/**
 * Nearest depth (world units from the camera) a shooting star can occupy.
 * Receding streaks start just beyond it and approaching streaks retire at it.
 */
export const SHOOTING_STAR_NEAR_DEPTH = 10;

/** Depth band (fractions of the max depth) receding streaks start in, beyond the near depth. */
export const SHOOTING_STAR_RECEDING_DEPTH_SPAN = 0.2;

/** Depth band (fractions of the max depth) for streaks with no depth motion: start and span. */
export const SHOOTING_STAR_LATERAL_DEPTH_START = 0.3;
export const SHOOTING_STAR_LATERAL_DEPTH_SPAN = 0.3;

/** Head radius as a multiple of `proximity * baseStarSize`. */
export const SHOOTING_STAR_HEAD_RADIUS_FACTOR = 0.4;

/** Head glow sprite size as a multiple of the head radius. */
export const SHOOTING_STAR_HEAD_SPRITE_SCALE = 6;

/**
 * Extra px kept between the frame edge and a streak's glow when deciding it is
 * off-screen, so a streak is born and retired fully out of view.
 */
export const SHOOTING_STAR_OFFSCREEN_PADDING = 4;

/** Drift components smaller than this count as "no travel along that axis". */
export const SHOOTING_STAR_AXIS_EPSILON = 1e-9;
