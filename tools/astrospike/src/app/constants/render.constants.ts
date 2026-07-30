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

/** Lowest stage zoom — the whole image fitted to the frame. */
export const STAGE_MIN_ZOOM = 1;

/** Highest stage zoom. The zoomed view renders from the full-resolution
 * bitmap, so this is real detail, not preview upscaling. */
export const STAGE_MAX_ZOOM = 8;

/** Zoom multiplier applied per wheel step. */
export const STAGE_WHEEL_ZOOM_FACTOR = 1.2;

/**
 * Pointer travel (CSS px) below which a press-and-release counts as a click
 * that toggles a star; beyond it, the gesture pans the zoomed view.
 */
export const STAGE_DRAG_THRESHOLD_CSS_PX = 5;

/**
 * How long a click on a star waits before toggling its spikes, in ms.
 *
 * A double-click is two clicks, so acting on the first one immediately made
 * opening a star's controls flash its spikes off and back on. Holding the
 * toggle for this long lets a second click cancel it, at the cost of that much
 * latency on every single click — which is why the window is kept as short as
 * a double-click plausibly is rather than as long as the platform allows (the
 * macOS interval is a user setting and reaches a full second).
 *
 * A double-click slower than this still leaks one toggle, and that case heals
 * itself: opening a star's controls guarantees the star is spiked, so the end
 * state is the same either way.
 */
export const STAGE_CLICK_HOLD_MS = 250;
