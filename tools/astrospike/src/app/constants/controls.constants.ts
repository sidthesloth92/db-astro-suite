import { ControlMetadata, EditorControlKey } from '../models/editor-controls.model';

/**
 * Static metadata for every editor slider, keyed by control key.
 */
export const CONTROLS: Record<EditorControlKey, ControlMetadata> = {
  stars: {
    label: 'Stars',
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
    description: 'Scales the length of every spike arm.',
    min: 0.2,
    max: 3,
    step: 0.05,
    initial: 1,
  },
  brightness: {
    label: 'Brightness',
    description: 'Scales the intensity of the spikes and their glow.',
    min: 0.2,
    max: 2,
    step: 0.05,
    initial: 1,
  },
  rotation: {
    label: 'Rotation',
    description: 'Rotates the whole spike pattern, in degrees.',
    min: 0,
    max: 90,
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
  'brightness',
  'rotation',
];
