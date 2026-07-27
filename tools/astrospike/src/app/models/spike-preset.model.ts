/**
 * Identifier of a built-in diffraction spike preset.
 */
export type SpikePresetId = 'subtle' | 'classic' | 'jwst';

/**
 * A named diffraction-spike style: arm count plus the geometry and intensity
 * ratios the renderer scales by image size and user controls.
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
  /** Base peak alpha of the arms before user brightness scaling. */
  intensityScale: number;
  /** Arm thickness as a fraction of the arm length. */
  thicknessRatio: number;
  /** Exponent shaping the alpha falloff along each arm. */
  falloffGamma: number;
  /** Glow sprite radius as a multiple of the arm thickness. */
  glowRadiusRatio: number;
  /** Base alpha of the central glow before user brightness scaling. */
  glowIntensity: number;
  /** Base rotation of the spike pattern in degrees. */
  rotationOffsetDeg: number;
}
