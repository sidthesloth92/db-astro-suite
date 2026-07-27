/**
 * Radius in CSS pixels of the ring drawn around the star under the pointer.
 */
export const HOVER_MARKER_RADIUS_CSS_PX = 13;

/**
 * Radius in CSS pixels of the ring marking a star the user switched off.
 */
export const DISABLED_MARKER_RADIUS_CSS_PX = 9;

/**
 * Stroke width in CSS pixels used for both marker rings.
 */
export const MARKER_LINE_WIDTH_CSS_PX = 2;

/**
 * Dash pattern (CSS pixels on, CSS pixels off) for the disabled-star ring —
 * dashes are what distinguish it from the solid hover ring.
 */
export const DISABLED_MARKER_DASH_CSS_PX: readonly number[] = [4, 4];
