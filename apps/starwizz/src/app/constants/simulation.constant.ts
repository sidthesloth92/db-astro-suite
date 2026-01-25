import { ControlKey, ControlMetadata } from '../models/simulation.model';

export const CANVAS_DIMENSIONS = {
  width: 1080,
  height: 1920,
};

export const DEFAULT_GALAXY_URL = 'Chrismas_Tree_HOO_16_9_full.jpg';

export const ASPECT_RATIOS = {
  // Vertical formats (social media)
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square' },
  '4:5': { width: 1080, height: 1350, label: '4:5 Portrait' },
  // YouTube horizontal formats
  '16:9_720p': { width: 1280, height: 720, label: '720p (1280×720)' },
  '16:9_1080p': { width: 1920, height: 1080, label: '1080p (1920×1080)' },
  '16:9_4k': { width: 3840, height: 2160, label: '4K (3840×2160)' },
};

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

export const CONTROLS: Record<ControlKey, ControlMetadata> = {
  zoomRate: {
    label: 'Zoom Speed',
    description: 'Controls how fast the camera zooms into the background. Higher values create a faster, more dramatic zoom.',
    min: 1,
    max: 50,
    step: 1,
    initial: 2,
    precision: 0,
    internalMultiplier: 0.0001,
  },
  rotationRate: {
    label: 'Rotation Speed',
    description: 'Controls how fast the scene rotates. Higher values create a spinning vortex effect.',
    min: 1,
    max: 50,
    step: 1,
    initial: 1,
    precision: 0,
    internalMultiplier: 0.0001,
  },
  shootingStarSpeed: {
    label: 'Shooting Star Speed',
    description: 'Controls how fast shooting stars streak across the screen.',
    min: 0,
    max: 10,
    step: 0.1,
    initial: 0.7,
    precision: 1,
  },
  starSpeed: {
    label: 'Star Speed',
    description: 'Controls the movement speed of background stars that create depth.',
    min: 0.1,
    max: 5,
    step: 0.1,
    initial: 0.6,
    precision: 1,
  },
  baseStarSize: {
    label: 'Star Size Multiplier',
    description: 'Controls the overall size of all stars in the simulation.',
    min: 1,
    max: 40,
    step: 0.5,
    initial: 10,
    precision: 1,
  },
};
