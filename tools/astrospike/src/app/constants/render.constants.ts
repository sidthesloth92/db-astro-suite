/**
 * Maximum dimension of the on-screen preview canvas in pixels; larger images
 * are previewed at reduced scale (export always renders full resolution).
 */
export const PREVIEW_MAX_DIMENSION = 2048;

/**
 * Maximum canvas dimension the app will attempt, mirroring common browser
 * canvas size limits. Images beyond this are rejected at load time.
 */
export const MAX_CANVAS_DIMENSION = 16384;

/**
 * Radius in CSS pixels around a pointer event within which a star is
 * considered hit for toggling.
 */
export const HIT_TEST_RADIUS_CSS_PX = 14;

/**
 * Width in pixels of the pre-rendered spike arm sprite (the falloff axis).
 */
export const ARM_SPRITE_WIDTH = 512;

/**
 * Height in pixels of the pre-rendered spike arm sprite (the thickness axis).
 */
export const ARM_SPRITE_HEIGHT = 64;

/**
 * Width and height in pixels of the square pre-rendered glow sprite.
 */
export const GLOW_SPRITE_SIZE = 64;
