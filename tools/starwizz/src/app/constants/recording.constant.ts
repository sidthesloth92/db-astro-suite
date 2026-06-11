import { RecordingPreset, RecordingPresetMetadata } from '../models/recording.model';

/** Maximum allowed recording duration in seconds before auto-stop. */
export const MAX_RECORDING_SECONDS = 30;

/** Preset applied on first load and restored on a full reset (image clear). */
export const DEFAULT_RECORDING_PRESET: RecordingPreset = 'social';

/**
 * Recording quality presets offered in the record split-button menu.
 * Bitrates are derived per format as `width × height × fps × bpp` (see
 * {@link RecordingPresetMetadata.bitsPerPixelPerFrame}), e.g. at the default
 * Reels format (1080×1920) a 30 s clip is ~47 MB (social), ~70 MB (maximum),
 * or ~16 MB (compact).
 */
export const RECORDING_PRESETS: Record<RecordingPreset, RecordingPresetMetadata> = {
  social: {
    label: 'Social Media',
    shortLabel: 'Social',
    description:
      'Tuned for Instagram, TikTok & Shorts — high enough quality to survive their compression',
    fps: 60,
    bitsPerPixelPerFrame: 0.1,
  },
  maximum: {
    label: 'Maximum Quality',
    shortLabel: 'Max',
    description: 'Sharpest possible master copy — biggest file',
    fps: 60,
    bitsPerPixelPerFrame: 0.15,
  },
  compact: {
    label: 'Smaller File',
    shortLabel: 'Smaller',
    description: 'Lighter and quicker to share — still smooth',
    fps: 30,
    bitsPerPixelPerFrame: 0.07,
  },
};

/** Preset keys in the order they render in the split-button menu. */
export const RECORDING_PRESET_ORDER: readonly RecordingPreset[] = [
  'social',
  'maximum',
  'compact',
];

/**
 * Preset keys in low→high quality order for the compact mobile pill selector,
 * placing the default (`social`) in the middle so it reads as a quality dial.
 */
export const RECORDING_PRESET_TAB_ORDER: readonly RecordingPreset[] = [
  'compact',
  'social',
  'maximum',
];

/** Lower bitrate clamp — keeps small/slow formats from dipping into mud. */
export const MIN_VIDEO_BITS_PER_SECOND = 4_000_000;

/**
 * Upper bitrate clamp — a memory guard for the in-RAM recording buffer
 * (4K@60 on the maximum preset peaks just under it at ~74.6 Mbps ≈ 280 MB
 * for a full 30 s clip).
 */
export const MAX_VIDEO_BITS_PER_SECOND = 80_000_000;

/**
 * MediaRecorder MIME-type ladder, best first. H.264 High profile compresses
 * ~30% better than Baseline at the same quality; levels 5.2/5.1 cover 4K@60.
 * No audio codec is requested — the canvas capture stream has no audio track.
 */
export const RECORDING_MIME_TYPES: readonly string[] = [
  'video/mp4;codecs=avc1.640034', // H.264 High @ L5.2 (4K@60)
  'video/mp4;codecs=avc1.640033', // H.264 High @ L5.1
  'video/mp4;codecs=avc1.4D4034', // H.264 Main @ L5.2
  'video/mp4;codecs=avc1.42E034', // H.264 Constrained Baseline @ L5.2
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm',
];
