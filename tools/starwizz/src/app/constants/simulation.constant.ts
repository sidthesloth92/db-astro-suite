import { ControlKey, ControlMetadata } from '../models/simulation.model';

export const CANVAS_DIMENSIONS = {
  width: 1080,
  height: 1920,
};

export const DEFAULT_GALAXY_URL = 'Chrismas_Tree_HOO_16_9_full.jpg';

export const FORMATS = {
  'reels': { width: 1080, height: 1920, label: '9:16 · Reels · 1080×1920' },
  'instagram-portrait': { width: 1080, height: 1350, label: '4:5 · Portrait · 1080×1350' },
  'instagram-post': { width: 1080, height: 1080, label: '1:1 · Square · 1080×1080' },
  'tiktok': { width: 1080, height: 1920, label: '9:16 · 1080×1920' },
  'shorts': { width: 1080, height: 1920, label: '9:16 · Shorts · 1080×1920' },
  'youtube-720p': { width: 1280, height: 720, label: '16:9 · 720p · 1280×720' },
  'youtube-1080p': { width: 1920, height: 1080, label: '16:9 · 1080p · 1920×1080' },
  'youtube-4k': { width: 3840, height: 2160, label: '16:9 · 4K · 3840×2160' },
  'snapchat': { width: 1080, height: 1920, label: '9:16 · 1080×1920' },
};

export type FormatKey = keyof typeof FORMATS;

/**
 * Format keys grouped by social-media platform, in dropdown render order.
 * Each platform becomes an `<optgroup>` header; nested keys map to options
 * that read out of `FORMATS` for their label and value.
 */
export const FORMAT_GROUPS: readonly { label: string; keys: readonly FormatKey[] }[] = [
  { label: 'Instagram', keys: ['reels', 'instagram-portrait', 'instagram-post'] },
  { label: 'TikTok', keys: ['tiktok'] },
  { label: 'YouTube', keys: ['shorts', 'youtube-720p', 'youtube-1080p', 'youtube-4k'] },
  { label: 'Snapchat', keys: ['snapchat'] },
];

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
