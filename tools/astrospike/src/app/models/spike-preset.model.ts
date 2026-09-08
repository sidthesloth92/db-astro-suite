/**
 * Identifier of a built-in star embellishment preset.
 */
export type SpikePresetId = 'subtle' | 'classic' | 'jwst' | 'glow';

/**
 * Shape of the two-scale halo the Glow control draws on a star: a wide
 * Moffat-tailed skirt in the star's skirt colour under a compact core tinted
 * towards white. All radii resolve against the image's larger dimension, all
 * intensities against the star's relative flux.
 *
 * The point of the profile is selectivity. A floor on the relative scale, like
 * the one {@link starSpikeScale} keeps so every spiked star stays visibly
 * spiked, hands every star of a dense Milky Way frame a similar bloom and the
 * field fogs over; the halo scales on a floorless power law of relative flux
 * instead, so only the brightest handful of stars bloom and the rest stay
 * pinpoints — which is the whole mist-filter look.
 */
export interface HaloProfile {
  /** Halo radius at full amount, as a fraction of the image's larger dimension. */
  haloRadiusScale: number;
  /** Peak alpha of the halo skirt at full amount for the reference star. */
  haloIntensity: number;
  /** Moffat falloff exponent of the halo mask — lower keeps a longer tail. */
  haloFalloffBeta: number;
  /** Radius of the hot core as a fraction of the halo radius. */
  coreRadiusRatio: number;
  /** Peak alpha of the hot core at full amount for the reference star. */
  coreIntensity: number;
  /** How far the core colour is blended towards white, in [0, 1]. */
  coreWhiteness: number;
  /** Exponent on relative flux: lower spreads halos further down in brightness. */
  fluxGamma: number;
}

/**
 * A named diffraction-spike style: arm count plus the geometry and intensity
 * ratios the renderer scales by image size and user controls.
 *
 * How much a star glows is NOT part of the preset — that is the independent
 * Glow control, adjustable on any preset and per star. The `glow` preset is a
 * mode more than a style: applying it seeds the controls for a halo-only look
 * (Length to zero, Glow up) and the pane trims itself to the controls that
 * still do anything.
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
  /**
   * Core-glow radius as a multiple of the arm thickness. This is the small
   * glow every spiked star has, NOT the Glow halo — that one is sized from
   * {@link haloProfile}, because hanging a halo off arm thickness collapses
   * it to a fixed few pixels once the arms fade away.
   */
  glowRadiusRatio: number;
  /** Base alpha of the glow before user brightness scaling. */
  glowIntensity: number;
  /** Base rotation of the spike pattern in degrees. */
  rotationOffsetDeg: number;
  /**
   * Two-scale halo the Glow control draws under this preset's arms, or on its
   * own once Length is zero. Every preset carries one, so raising Glow means
   * the same thing whatever style is active.
   */
  haloProfile: HaloProfile;
}
