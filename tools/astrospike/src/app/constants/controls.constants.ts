import { ControlMetadata, EditorControlKey } from '../models/editor-controls.model';

/**
 * Static metadata for every editor slider, keyed by control key.
 */
export const CONTROLS: Record<EditorControlKey, ControlMetadata> = {
  stars: {
    label: 'Star magnitude',
    description: 'How many detected stars get spikes or glow, brightest first.',
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
      'Scales the length of every spike arm. At 0 there is no spike at all, which leaves a star showing only its glow halo.',
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
  // record, the per-star adjustment, and the formatter); only the words changed
  // when the bloom became the mist-filter halo.
  glow: {
    label: 'Glow',
    description:
      'Blooms the brightest stars into wide, soft halos in their own colour — the look of a mist filter on the lens. Faint stars stay pinpoints. Independent of the spikes: the Diffusion preset gives you the halos on their own.',
    min: 0,
    max: 1,
    step: 0.05,
    // Zero, so an image opens rendered exactly as the preset intends and
    // glow is something the user reaches for rather than undoes.
    initial: 0,
  },
  mist: {
    label: 'Mist',
    description:
      'Spreads the light of the frame\'s brightest regions into a soft haze, so the Milky Way core and nebulae glow the way they do through a mist filter. Dark sky stays dark. Part of the Diffusion mode, which is the only place it applies.',
    min: 0,
    max: 1,
    step: 0.05,
    // Zero for the same reason as Glow: an image opens as its preset intends.
    initial: 0,
  },
  brightness: {
    label: 'Brightness',
    description:
      'Scales the intensity of the spikes, their core glow, and the glow halos. At 0 nothing is drawn.',
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
  'glow',
  'brightness',
  'rotation',
];

/**
 * The sliders shown while the Diffusion preset is active: which stars are in
 * the cut, how far they glow, how much the frame mists, and how hard the
 * halos burn. Every other control shapes the arms, which the mode has zeroed
 * away — and Mist belongs to this mode alone, so it appears nowhere else.
 */
export const DIFFUSION_MODE_CONTROL_KEYS: readonly EditorControlKey[] = [
  'stars',
  'glow',
  'mist',
  'brightness',
];
