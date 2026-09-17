/**
 * Mean RGB color sampled from a star's core pixels. Each channel is in the
 * 0–255 range, normalized so the brightest channel equals 255.
 */
export interface StarColor {
  /** Red channel, 0–255. */
  r: number;
  /** Green channel, 0–255. */
  g: number;
  /** Blue channel, 0–255. */
  b: number;
}

/**
 * A star produced by the detection pipeline. Coordinates are sub-pixel
 * centroids in FULL-RESOLUTION image pixels (not detection-scale pixels),
 * while `flux`, `area`, and `elongation` are measured at detection scale.
 */
export interface DetectedStar {
  /** Index of this star in the flux-descending sorted detection list. */
  id: number;
  /** Sub-pixel x centroid in full-resolution image pixels. */
  x: number;
  /** Sub-pixel y centroid in full-resolution image pixels. */
  y: number;
  /** Background-subtracted integrated flux at detection scale. */
  flux: number;
  /** Refined background-subtracted peak value at full resolution. */
  peak: number;
  /** Pixel count of the detected source component at detection scale. */
  area: number;
  /** Shape elongation sqrt(l1 / l2) from second central moments; 1 = round. */
  elongation: number;
  /** Mean RGB color of the star core, brightest channel normalized to 255. */
  color: StarColor;
  /**
   * Colour of the star's skirt — the unclipped light just outside the blown
   * core — sky-subtracted, saturation-boosted, brightest channel normalized
   * to 255. Tints the Glow halo, where the star's own hue must survive even
   * when its core reads white.
   */
  haloColor: StarColor;
}
