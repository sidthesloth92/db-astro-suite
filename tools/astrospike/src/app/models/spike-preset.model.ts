/**
 * Identifier of a built-in star embellishment preset.
 */
export type SpikePresetId = 'subtle' | 'classic' | 'jwst';

/**
 * A named diffraction-spike style: arm count plus the geometry and intensity
 * ratios the renderer scales by image size and user controls.
 *
 * How spiked or how bloomed a star looks is NOT part of the preset — that is
 * the Diffusion control, which crossfades between the two on any preset and
 * can be set per star.
 */
export interface SpikePreset {
  /** Stable preset identifier. */
  id: SpikePresetId;
  /** User-visible preset name. */
  label: string;
  /** Short user-facing description of the look. */
  description: string;
  /** Number of spike arms rendered per star. */
  spikeCount: 4 | 6;
  /** Base arm length as a fraction of the image's larger dimension. */
  lengthScale: number;
  /**
   * Bloom radius at full diffusion, as a fraction of the image's larger
   * dimension.
   *
   * Deliberately separate from {@link lengthScale} even though the same user
   * Length control drives both: a readable bloom is an order of magnitude
   * smaller than a readable arm, so one number cannot serve both without
   * giving stubs where arms belong or a halo the size of the arms it replaced.
   */
  glowRadiusScale: number;
  /** Base peak alpha of the arms before user brightness scaling. */
  intensityScale: number;
  /** Arm thickness as a fraction of the arm length. */
  thicknessRatio: number;
  /** Exponent shaping the alpha falloff along each arm. */
  falloffGamma: number;
  /**
   * Core-glow radius as a multiple of the arm thickness. This is the small
   * glow every spiked star has, NOT the diffusion bloom — that one is sized
   * from {@link glowRadiusScale}, because hanging a bloom off arm thickness
   * collapses it to a fixed few pixels once the arms fade away.
   */
  glowRadiusRatio: number;
  /** Base alpha of the glow before user brightness scaling. */
  glowIntensity: number;
  /** Base rotation of the spike pattern in degrees. */
  rotationOffsetDeg: number;
}
