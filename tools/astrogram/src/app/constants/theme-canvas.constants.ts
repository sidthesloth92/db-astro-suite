/**
 * Design-canvas basis for card themes.
 *
 * Every ported theme was authored against the design source's fixed
 * 540 × 720 artboard, so its paddings, type sizes and decorative geometry
 * are absolute pixels on that canvas. Rendering a theme directly into a
 * card box shorter than 3:4 (e.g. 1:1) therefore ran the content off the
 * bottom edge, where `.card` clipped it.
 *
 * `theme-canvas.util.ts` uses these values to build a layout canvas that
 * always *contains* the design box, which is then scaled to fill the card.
 */

/** Width of the design artboard themes are authored against, in px. */
export const THEME_DESIGN_WIDTH = 540;

/** Height of the design artboard themes are authored against, in px. */
export const THEME_DESIGN_HEIGHT = 720;

/**
 * Card opacity applied when a dark theme is selected. Below 1 the theme's
 * backdrop fades toward the user's own image behind the card.
 */
export const DEFAULT_DARK_THEME_OPACITY = 0.6;

/**
 * Card opacity applied when a light theme is selected. Light-on-paper designs
 * stay fully opaque: a dark astrophotograph showing through pale type would
 * make the card unreadable.
 */
export const DEFAULT_LIGHT_THEME_OPACITY = 1;
