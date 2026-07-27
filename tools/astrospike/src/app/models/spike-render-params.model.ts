import { DetectedStar } from './detected-star.model';
import { SpikePreset } from './spike-preset.model';

/**
 * Everything the spike renderer needs to draw one frame onto a canvas.
 */
export interface SpikeRenderParams {
  /** Stars to render, coordinates in full-resolution image pixels. */
  stars: readonly DetectedStar[];

  /**
   * Flux of the brightest *detected* star, which anchors every star's relative
   * spike scale. It is deliberately not derived from `stars`: excluding the
   * brightest star with a per-star toggle would otherwise re-anchor the scale
   * and grow every remaining star's spikes, turning a local click into a global
   * change.
   */
  fluxRef: number;
  /** Active spike preset supplying geometry and intensity ratios. */
  preset: SpikePreset;
  /** Number of spike arms per star (may override the preset's count). */
  spikeCount: 4 | 6;
  /** User length multiplier applied on top of the preset's length scale. */
  lengthFactor: number;
  /** User brightness multiplier applied to arm and glow alpha. */
  intensityFactor: number;
  /** User rotation of the spike pattern in degrees. */
  rotationDeg: number;
  /** Larger dimension of the full-resolution image in pixels. */
  imageMaxDimension: number;
  /** Scale from full-resolution image pixels to target canvas pixels. */
  scale: number;
}

/**
 * Cache of pre-rendered arm/glow sprites keyed by quantized color (and
 * falloff gamma for arms). Shared across render calls to avoid rebuilds.
 */
export type SpriteCache = Map<string, HTMLCanvasElement>;

/**
 * Per-star spike geometry derived from flux, preset, and user controls —
 * all values in target canvas pixels or 0–1 alpha.
 */
export interface SpikeGeometry {
  /** Length of each spike arm in canvas pixels. */
  lengthPx: number;
  /** Peak alpha (0–1) applied when drawing each arm sprite. */
  alphaPeak: number;
  /** Arm thickness in canvas pixels, clamped to a renderable range. */
  thicknessPx: number;
  /** Radius of the central glow in canvas pixels. */
  glowRadiusPx: number;
  /** Alpha (0–1) applied when drawing the glow sprite. */
  glowAlpha: number;
}
