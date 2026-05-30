/** Lower zoom bound — 1 = fit-to-card (no zoom-out past the full frame). */
export const MIN_ZOOM = 1;

/** Upper zoom bound for both wheel and button zoom. */
export const MAX_ZOOM = 8;

/** Multiplier applied per click of the toolbar +/− zoom buttons. */
export const ZOOM_BUTTON_FACTOR = 1.4;

/**
 * Wheel-zoom sensitivity. `nextZoom = zoom * exp(-deltaY * SENSITIVITY)` so a
 * standard wheel notch (~100 px deltaY) produces a smooth ~16% step, and the
 * exponential keeps zoom symmetric across in/out.
 */
export const WHEEL_ZOOM_SENSITIVITY = 0.0015;
