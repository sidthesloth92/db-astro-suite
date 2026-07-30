import { ControlMetadata, EditorControlKey } from '../models/editor-controls.model';

/**
 * Static metadata for every editor slider, keyed by control key.
 */
export const CONTROLS: Record<EditorControlKey, ControlMetadata> = {
  stars: {
    label: 'Star magnitude',
    description: 'How many detected stars receive spikes, brightest first.',
    min: 0,
    max: 1,
    step: 0.01,
    // The cut is log-scaled (n = total^value), so this lands on ~45 of 2000
    // stars in a dense field and ~8 of 70 in a sparse one. Higher defaults
    // spike so many stars that dense frames read as an artificial crosshatch.
    initial: 0.5,
  },
  length: {
    label: 'Length',
    description:
      'Scales the length of every spike arm. At 0 there is no spike at all, which leaves a star showing only its diffusion bloom.',
    min: 0,
    max: 3,
    step: 0.05,
    initial: 1,
  },
  chroma: {
    label: 'Chroma',
    description:
      'Separates the colour along each arm, cool at the root and red at the tip, the way diffraction spreads light by wavelength. At 0 each arm is one flat colour.',
    min: 0,
    max: 1,
    step: 0.05,
    // A restrained default: the separation is what makes a spike look like
    // light rather than a drawn line, and it is the first thing anyone notices
    // in a side-by-side, so it earns its place on by default.
    initial: 0.35,
  },
  diffusion: {
    label: 'Diffusion',
    description:
      'Blooms each star, the look of a diffusion filter on the lens. Independent of the spikes: it adds the bloom and leaves the arms alone — the Diffusion preset gives you the bloom on its own.',
    min: 0,
    max: 1,
    step: 0.05,
    // Zero, so an image opens rendered exactly as the preset intends and
    // diffusion is something the user reaches for rather than undoes.
    initial: 0,
  },
  brightness: {
    label: 'Brightness',
    description:
      'Scales the intensity of the spikes and their core glow. At 0 the spikes disappear; the diffusion bloom is independent and stays.',
    min: 0,
    max: 2,
    step: 0.05,
    initial: 1,
  },
  rotation: {
    label: 'Rotation',
    description: 'Rotates the whole spike pattern, in degrees.',
    min: 0,
    max: 180,
    step: 1,
    initial: 0,
  },
};

/**
 * Display order of the editor sliders.
 */
export const EDITOR_CONTROL_KEYS: readonly EditorControlKey[] = [
  'stars',
  'length',
  'chroma',
  'diffusion',
  'brightness',
  'rotation',
];

/**
 * The sliders shown while the Diffusion preset is active. The bloom is driven
 * only by which stars are in the cut and the diffusion amount — every other
 * control shapes the arms, which the mode has zeroed away.
 */
export const DIFFUSION_CONTROL_KEYS: readonly EditorControlKey[] = ['stars', 'diffusion'];
