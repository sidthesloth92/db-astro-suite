/**
 * A plain RGB colour with 0–255 channels.
 */
export interface RgbColor {
  /** Red channel, 0–255. */
  r: number;
  /** Green channel, 0–255. */
  g: number;
  /** Blue channel, 0–255. */
  b: number;
}

/**
 * A palette entry describing one natural star tint and how often it occurs.
 */
export interface StarColor extends RgbColor {
  /** Relative spawn weight — larger values make the colour more common. */
  weight: number;
}

/**
 * Pre-rendered sprite canvases for the star field, one entry per palette
 * colour. `glow` and `spikes` are parallel arrays indexed by the star's
 * colour index.
 */
export interface StarSprites {
  /** Soft radial-glow sprite per palette colour. */
  glow: HTMLCanvasElement[];
  /** Four-point diffraction-spike sprite per palette colour. */
  spikes: HTMLCanvasElement[];
}
