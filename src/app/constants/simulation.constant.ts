import { ControlKey, ControlMetadata } from '../models/simulation.model';

export const CANVAS_DIMENSIONS = {
  width: 1080,
  height: 1920,
};

export const DEFAULT_GALAXY_URL = 'Chrismas_Tree_HOO_16_9_full.jpg';

export const ASPECT_RATIOS = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square' },
  '4:5': { width: 1080, height: 1350, label: '4:5 Portrait' },
};

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

export const CONTROLS: Record<ControlKey, ControlMetadata> = {
  zoomRate: {
    label: 'Zoom Speed',
    min: 1,
    max: 50,
    step: 1,
    initial: 2,
    precision: 0,
    internalMultiplier: 0.0001,
  },
  rotationRate: {
    label: 'Rotation Speed',
    min: 1,
    max: 50,
    step: 1,
    initial: 1,
    precision: 0,
    internalMultiplier: 0.0001,
  },
  shootingStarSpeed: {
    label: 'Shooting Star Speed',
    min: 0,
    max: 10,
    step: 0.1,
    initial: 0.7,
    precision: 1,
  },
  starSpeed: {
    label: 'Star Speed',
    min: 0.1,
    max: 5,
    step: 0.1,
    initial: 0.6,
    precision: 1,
  },
  baseStarSize: {
    label: 'Star Size Multiplier',
    min: 1,
    max: 40,
    step: 0.5,
    initial: 10,
    precision: 1,
  },
};
