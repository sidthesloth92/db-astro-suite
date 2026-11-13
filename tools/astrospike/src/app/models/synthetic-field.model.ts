import { StarColor } from './detected-star.model';

/**
 * One Gaussian star injected into a synthetic test field.
 */
export interface SyntheticStar {
  /** Star center x in pixels (may be sub-pixel). */
  x: number;
  /** Star center y in pixels (may be sub-pixel). */
  y: number;
  /** Peak brightness added at the star center (0–255 scale). */
  amplitude: number;
  /** Gaussian sigma of the star profile in pixels. */
  sigma: number;
  /** Optional tint; scales the star contribution per channel by color/255. */
  color?: StarColor;
}

/**
 * Flat-plus-linear-gradient background of a synthetic test field.
 */
export interface SyntheticBackground {
  /** Constant background level (0–255 scale). */
  base: number;
  /** Background increase per pixel along the x axis. */
  gradientX: number;
  /** Background increase per pixel along the y axis. */
  gradientY: number;
}
