import { HaloProfile, SpikePreset, SpikePresetId } from '../models/spike-preset.model';

/**
 * The halo every preset draws when the Glow control is raised.
 *
 * One shared profile rather than one per preset: the halo is the mist-filter
 * look, and that look does not change with the spike style layered on top of
 * it. Its numbers were tuned by measurement against reference Milky Way
 * widefields (an 8-candidate sweep on a 1920 px core frame): for a reference
 * star at Glow 0.6 the added light holds half its peak out to ~0.8% of the
 * image's larger dimension, a tenth near 2%, and is still faintly alive at
 * 4%, and the skirt raises the star's saturation rather than bleaching it.
 * The hot core is deliberately tiny — 8% of the halo — because a wider one
 * whitens the very ring where the halo's colour has to show. Selectivity
 * comes from the floorless flux power law meeting HALO_MIN_VISIBLE_ALPHA:
 * at Glow 0.6 a star about 5.7 magnitudes below the reference draws nothing
 * at all (about 6.8 at Glow 1), and everything between shrinks and fades
 * smoothly toward that edge.
 */
export const DEFAULT_HALO_PROFILE: HaloProfile = {
  haloRadiusScale: 0.08,
  haloIntensity: 0.9,
  haloFalloffBeta: 1.5,
  coreRadiusRatio: 0.08,
  coreIntensity: 0.7,
  coreWhiteness: 0.6,
  fluxGamma: 0.5,
};

/**
 * Built-in diffraction spike presets, keyed by preset id.
 */
export const SPIKE_PRESETS: Record<SpikePresetId, SpikePreset> = {
  subtle: {
    id: 'subtle',
    label: 'Subtle',
    description: 'Short, faint 4-spike accent that keeps the image natural.',
    spikeCount: 4,
    lengthScale: 0.06,
    intensityScale: 0.55,
    thicknessRatio: 0.03,
    falloffGamma: 2.6,
    glowRadiusRatio: 2.5,
    glowIntensity: 0.22,
    rotationOffsetDeg: 45,
    haloProfile: DEFAULT_HALO_PROFILE,
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'The 4-spike Newtonian look from a cross-shaped spider vane.',
    spikeCount: 4,
    lengthScale: 0.12,
    intensityScale: 0.8,
    thicknessRatio: 0.035,
    falloffGamma: 2.2,
    glowRadiusRatio: 3.0,
    glowIntensity: 0.35,
    rotationOffsetDeg: 45,
    haloProfile: DEFAULT_HALO_PROFILE,
  },
  jwst: {
    id: 'jwst',
    label: 'JWST',
    description: 'The 6-spike look of the James Webb Space Telescope.',
    spikeCount: 6,
    lengthScale: 0.16,
    intensityScale: 0.9,
    thicknessRatio: 0.035,
    falloffGamma: 2.0,
    glowRadiusRatio: 3.0,
    glowIntensity: 0.4,
    rotationOffsetDeg: 90,
    haloProfile: DEFAULT_HALO_PROFILE,
  },
  // The arm ratios are Classic's: they only matter if the user re-raises
  // Length from a spike preset later, and matching Classic makes that
  // transition unsurprising. The mode itself comes from the seeded controls.
  diffusion: {
    id: 'diffusion',
    label: 'Diffusion',
    description:
      'The diffusion-filter look without the filter — add a glow to your stars and a Mist haze to your sky.',
    spikeCount: 4,
    lengthScale: 0.12,
    intensityScale: 0.8,
    thicknessRatio: 0.035,
    falloffGamma: 2.2,
    glowRadiusRatio: 3.0,
    glowIntensity: 0.35,
    rotationOffsetDeg: 45,
    haloProfile: DEFAULT_HALO_PROFILE,
  },
};

/**
 * Preset selected when the editor first loads.
 */
export const DEFAULT_PRESET_ID: SpikePresetId = 'classic';

/**
 * Display order of the presets in the preset picker.
 */
export const SPIKE_PRESET_ORDER: readonly SpikePresetId[] = ['subtle', 'classic', 'jwst', 'diffusion'];

/**
 * Glow amount seeded when the Diffusion preset is applied while the control
 * still sits at zero — the mode must visibly do something the moment it is
 * picked. A control the user already raised is left alone.
 */
export const DIFFUSION_PRESET_SEED_AMOUNT = 0.6;
