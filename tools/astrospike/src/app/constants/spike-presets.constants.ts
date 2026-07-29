import { SpikePreset, SpikePresetId } from '../models/spike-preset.model';

/**
 * Built-in star embellishment presets, keyed by preset id.
 */
export const SPIKE_PRESETS: Record<SpikePresetId, SpikePreset> = {
  subtle: {
    id: 'subtle',
    label: 'Subtle',
    description: 'Short, faint 4-spike accent that keeps the image natural.',
    style: 'spikes',
    spikeCount: 4,
    lengthScale: 0.06,
    glowRadiusScale: 0.009,
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
    style: 'spikes',
    spikeCount: 4,
    lengthScale: 0.12,
    glowRadiusScale: 0.013,
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
    style: 'spikes',
    spikeCount: 6,
    lengthScale: 0.16,
    glowRadiusScale: 0.015,
    intensityScale: 0.9,
    thicknessRatio: 0.035,
    falloffGamma: 2.0,
    glowRadiusRatio: 3.0,
    glowIntensity: 0.4,
    rotationOffsetDeg: 90,
  },
  diffusion: {
    id: 'diffusion',
    label: 'Diffusion',
    description: 'Soft bloom with no arms — the diffusion-filter look for wide fields.',
    style: 'glow',
    // Arm geometry is inert under `glow`; these keep the record uniform and
    // supply the arm shape if a single star is switched to spikes.
    spikeCount: 4,
    // Matches Classic, so a single star switched to spikes inside a bloomed
    // field gets full-length arms rather than stubs.
    lengthScale: 0.12,
    glowRadiusScale: 0.014,
    intensityScale: 0.8,
    thicknessRatio: 0.035,
    falloffGamma: 2.2,
    glowRadiusRatio: 3.0,
    glowIntensity: 0.85,
    rotationOffsetDeg: 45,
  },
};

/**
 * Preset selected when the editor first loads.
 */
export const DEFAULT_PRESET_ID: SpikePresetId = 'classic';

/**
 * Display order of the presets in the preset picker.
 */
export const SPIKE_PRESET_ORDER: readonly SpikePresetId[] = [
  'subtle',
  'classic',
  'jwst',
  'diffusion',
];
