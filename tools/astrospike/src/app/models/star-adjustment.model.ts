import { SpikeStyle } from './spike-style.model';

/**
 * Per-star tweaks layered on top of the global spike controls.
 *
 * Every field is a multiplier, offset, or opt-out applied to what the global
 * controls already produced for that star, so a star carrying the default
 * adjustment looks exactly as it did before it was ever touched.
 */
export interface StarAdjustment {
  /** Extra length multiplier for this star's arms or bloom. */
  lengthFactor: number;
  /** Extra brightness multiplier for this star's arms and glow. */
  intensityFactor: number;
  /** Extra rotation for this star's arms, in degrees. */
  rotationDeg: number;
  /**
   * Effect drawn for this star, or null to follow the active preset. Set it
   * to bloom one star in a spiked field, or spike one star in a bloomed one.
   */
  style: SpikeStyle | null;
}
