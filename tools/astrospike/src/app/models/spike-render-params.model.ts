import { DetectedStar } from './detected-star.model';
import { StarAdjustment } from './star-adjustment.model';
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

  /**
   * Ids of stars the user manually forced ON. They render with a minimum
   * brightness scale so the click has a visible result even for stars whose
   * own flux would produce sub-pixel spikes.
   */
  forcedStarIds: ReadonlySet<number>;

  /**
   * Per-star tweaks keyed by star id. A star absent from the map renders on
   * the global controls alone.
   */
  adjustments: ReadonlyMap<number, StarAdjustment>;

  /** Horizontal canvas-pixel offset added after scaling (viewport pan). */
  offsetX: number;

  /** Vertical canvas-pixel offset added after scaling (viewport pan). */
  offsetY: number;
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
  /**
   * Global diffusion amount in [0, 1] crossfading arms into a bloom. A star
   * naming its own amount in its adjustment overrides this one.
   */
  diffusionFactor: number;
  /**
   * How far apart the arm's colours are pulled along its length, in [0, 1].
   * Zero draws each arm in one flat colour.
   */
  chromaFactor: number;
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
 * Per-star diffusion bloom, in target canvas pixels and 0–1 alpha. Its radius
 * is sized from the image and the star's brightness rather than from arm
 * thickness, which is what keeps a bloom brightness-ordered once diffusion has
 * faded the arms away entirely.
 */
export interface BloomGeometry {
  /** Radius of the bloom in canvas pixels. */
  radiusPx: number;
  /** Alpha (0–1) applied when drawing the glow sprite. */
  alpha: number;
}

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
