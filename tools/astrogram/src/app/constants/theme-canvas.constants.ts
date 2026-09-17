import type { AspectRatio } from '../models/card-data.model';

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
 * Card opacity applied when a dark theme is selected, and the value the card
 * boots with. Below 1 the theme's backdrop fades toward the user's own image
 * behind the card; 0.8 lets the photograph read through without washing out
 * the design.
 */
export const DEFAULT_DARK_THEME_OPACITY = 0.8;

/**
 * Card opacity applied when a light theme is selected. Light-on-paper designs
 * stay fully opaque: a dark astrophotograph showing through pale type would
 * make the card unreadable.
 */
export const DEFAULT_LIGHT_THEME_OPACITY = 1;

/**
 * Formats that lay a theme out on its shorter landscape artboard.
 *
 * A theme keeps its full design height on any card wider than its artboard,
 * which is what stops content clipping on 1:1. At Instagram's 1.91:1
 * landscape that same 720 px of height is squeezed into a 566 px export, so
 * every theme renders at well under half the type size it gets at 3:4 and
 * reads as a small portrait layout floating in a wide frame. Themes that
 * declare a `landscapeBasisHeight` lay out against that shorter artboard here
 * instead — enlarging everything as far as that theme's content allows.
 *
 * Scoped to the landscape preset deliberately: `auto` also produces wide
 * cards, but at arbitrary aspects the measured heights would not be
 * guaranteed to fit.
 */
export const LANDSCAPE_ASPECT_RATIOS: readonly AspectRatio[] = ['1.91:1'];
