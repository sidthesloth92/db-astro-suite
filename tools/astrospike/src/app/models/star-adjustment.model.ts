/**
 * Per-star tweaks layered on top of the global spike controls.
 *
 * Every field is a multiplier or offset applied to what the global sliders
 * already produced for that star, so a star carrying the default adjustment
 * looks exactly as it did before it was ever touched.
 */
export interface StarAdjustment {
  /** Extra length multiplier for this star's arms. */
  lengthFactor: number;
  /** Extra brightness multiplier for this star's arms and glow. */
  intensityFactor: number;
  /** Extra rotation for this star's arms, in degrees. */
  rotationDeg: number;
}
