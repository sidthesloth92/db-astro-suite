import { SpikeStyle } from './spike-style.model';

/**
 * Identifier of a built-in star embellishment preset.
 */
export type SpikePresetId = 'subtle' | 'classic' | 'jwst' | 'diffusion';

/**
 * A named star-embellishment style: the effect it draws plus the geometry and
 * intensity ratios the renderer scales by image size and user controls.
 *
 * Some fields apply to one style only. A `glow` preset draws no arms, so the
 * arm-shaped ratios below are inert for it; each field says so.
 */
export interface SpikePreset {
  /** Stable preset identifier. */
  id: SpikePresetId;
  /** User-visible preset name. */
  label: string;
  /** Short user-facing description of the look. */
  description: string;
  /** Whether this preset draws diffraction arms or only a soft bloom. */
  style: SpikeStyle;
  /** Number of spike arms rendered per star. Inert under `glow`. */
  spikeCount: 4 | 6;
  /** Base arm length as a fraction of the image's larger dimension. */
  lengthScale: number;
  /**
   * Base bloom radius as a fraction of the image's larger dimension.
   *
   * Deliberately separate from {@link lengthScale} even though the same user
   * Length control drives both: a readable bloom is an order of magnitude
   * smaller than a readable arm. Sharing one number gives a star switched to
   * spikes inside a bloomed field stubs instead of arms, and a star switched
   * to a bloom inside a spiked field a halo the size of the arms it replaced.
   * Every preset carries both so either choice looks right on any star.
   */
  glowRadiusScale: number;
  /** Base peak alpha of the arms before user brightness scaling. Inert under `glow`. */
  intensityScale: number;
  /** Arm thickness as a fraction of the arm length. Inert under `glow`. */
  thicknessRatio: number;
  /** Exponent shaping the alpha falloff along each arm. Inert under `glow`. */
  falloffGamma: number;
  /**
   * Core-glow radius as a multiple of the arm thickness. Inert under `glow`,
   * which sizes its bloom from `lengthScale` instead — hanging a bloom off arm
   * thickness would collapse it to a fixed few pixels once there are no arms.
   */
  glowRadiusRatio: number;
  /** Base alpha of the glow before user brightness scaling. */
  glowIntensity: number;
  /** Base rotation of the spike pattern in degrees. Inert under `glow`. */
  rotationOffsetDeg: number;
}
