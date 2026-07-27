import { SpikePreset, SpikePresetId } from '../models/spike-preset.model';

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
  },
};

/**
 * Preset selected when the editor first loads.
 */
export const DEFAULT_PRESET_ID: SpikePresetId = 'classic';

/**
 * Display order of the presets in the preset picker.
 */
export const SPIKE_PRESET_ORDER: readonly SpikePresetId[] = ['subtle', 'classic', 'jwst'];
