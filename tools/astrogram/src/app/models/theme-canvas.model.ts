/**
 * The design artboard a card theme is authored against. Absolute paddings,
 * type sizes and decorative geometry inside a theme are pixels on this box.
 */
export interface ThemeDesignBasis {
  /** Artboard width in px. */
  readonly width: number;
  /** Artboard height in px. */
  readonly height: number;
}

/**
 * Layout box a theme is rendered into, plus the uniform scale that maps it
 * onto the real card. The canvas always contains the theme's design basis in
 * both axes, so no theme is ever given less room than it was authored for.
 */
export interface ThemeCanvas {
  /** Canvas width in px (theme lays out at this width). */
  readonly width: number;
  /** Canvas height in px (theme lays out at this height). */
  readonly height: number;
  /** Uniform scale applied to the canvas so it exactly fills the card box. */
  readonly scale: number;
}
