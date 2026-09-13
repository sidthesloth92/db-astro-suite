import {
  LANDSCAPE_ASPECT_RATIOS,
  THEME_DESIGN_HEIGHT,
  THEME_DESIGN_WIDTH,
} from '../constants/theme-canvas.constants';
import type { AspectRatio } from '../models/card-data.model';
import type { ThemeCanvas, ThemeDesignBasis } from '../models/theme-canvas.model';

/** Design basis used by every theme that does not declare its own. */
export const DEFAULT_THEME_BASIS: ThemeDesignBasis = {
  width: THEME_DESIGN_WIDTH,
  height: THEME_DESIGN_HEIGHT,
};

/**
 * Builds the layout canvas a card theme is rendered into.
 *
 * A theme's absolute type and spacing are authored against a fixed design
 * artboard (`basis`). Rendering it straight into the card box means every
 * aspect other than the artboard's own starves or stretches the layout —
 * a 1:1 card is 180 px shorter than the 540 × 720 artboard, so the last
 * gear rows and the Bortle meter fell off the bottom.
 *
 * Instead the canvas keeps the artboard's *limiting* dimension and grows
 * the other one to match the card's aspect, so the theme always has at
 * least its authored room on both axes. The canvas is then scaled by a
 * single uniform factor to exactly cover the card, which preserves the
 * design's proportions and keeps the export pixel-faithful.
 *
 * @param cardWidthPx Card's layout width in px (pre-transform).
 * @param cardAspect Card's width / height ratio.
 * @param basis Design artboard the theme was authored against.
 */
export function computeThemeCanvas(
  cardWidthPx: number,
  cardAspect: number,
  basis: ThemeDesignBasis = DEFAULT_THEME_BASIS,
): ThemeCanvas {
  const safeAspect = Number.isFinite(cardAspect) && cardAspect > 0 ? cardAspect : basis.width / basis.height;
  const designAspect = basis.width / basis.height;

  // Card at least as wide as the artboard → keep the artboard height and
  // widen. Card narrower → keep the artboard width and grow taller.
  const width = safeAspect >= designAspect ? basis.height * safeAspect : basis.width;
  const height = safeAspect >= designAspect ? basis.height : basis.width / safeAspect;

  const scale = cardWidthPx > 0 ? cardWidthPx / width : 1;
  return { width, height, scale };
}

/**
 * Resolves the artboard a theme lays out against for the current format.
 *
 * Every format uses the theme's authored basis except the landscape presets
 * in `LANDSCAPE_ASPECT_RATIOS`, where a theme that declares a
 * `landscapeBasisHeight` swaps in that shorter height. Its width is left
 * alone: `computeThemeCanvas` widens the canvas to the card's aspect anyway,
 * so only the height decides how large the theme renders.
 *
 * A declared height taller than the authored one is ignored — the landscape
 * artboard exists to shrink the canvas, never to stretch it.
 *
 * @param basis The theme's authored basis, or `undefined` for the default.
 * @param landscapeBasisHeight The theme's landscape artboard height, if any.
 * @param aspectRatio The card's current format.
 */
export function resolveThemeBasis(
  basis: ThemeDesignBasis | undefined,
  landscapeBasisHeight: number | undefined,
  aspectRatio: AspectRatio,
): ThemeDesignBasis {
  const authored = basis ?? DEFAULT_THEME_BASIS;
  const isLandscape = LANDSCAPE_ASPECT_RATIOS.includes(aspectRatio);
  if (!isLandscape || landscapeBasisHeight === undefined) {
    return authored;
  }
  const height = Math.min(landscapeBasisHeight, authored.height);
  return height > 0 ? { width: authored.width, height } : authored;
}
