/**
 * Per-star tweaks layered on top of the global spike controls.
 *
 * The three factors are relative to what the global controls already produced
 * for that star, so a star carrying the default adjustment looks exactly as it
 * did before it was ever touched.
 */
export interface StarAdjustment {
  /** Extra length multiplier for this star's arms. */
  lengthFactor: number;
  /** Extra brightness multiplier for this star's arms and glow. */
  intensityFactor: number;
  /** Extra rotation for this star's arms, in degrees. */
  rotationDeg: number;
  /**
   * This star's own diffusion amount in [0, 1], or null to follow the global
   * Diffusion control.
   *
   * Absolute rather than a multiplier, unlike the factors above, and
   * deliberately so: with the global control at zero a multiplier could never
   * bloom a single star, which is the whole point of setting it per star.
   */
  diffusion: number | null;
}
