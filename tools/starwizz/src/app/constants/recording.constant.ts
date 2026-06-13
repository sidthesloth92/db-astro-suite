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
 * MediaRecorder timeslice (ms). Chunked delivery serves two purposes: the
 * first chunk's arrival proves the encoder is actually producing data (see
 * the watchdog), and Chrome's MP4 muxer emits self-contained fragments that
 * concatenate into a valid file.
 */
export const RECORDING_TIMESLICE_MS = 1000;

/**
 * Delay (ms) before nudging the recorder with `requestData()` — a backstop
 * for browsers that ignore the timeslice, so the watchdog still sees a chunk
 * from a healthy encoder before it fires.
 */
export const RECORDING_REQUEST_DATA_NUDGE_MS = 1200;

/**
 * Watchdog deadline (ms): if no data chunk has arrived this long after
 * `start()`, the active codec is treated as dead (permissive
 * `isTypeSupported()` accepted a profile/level the device encoder rejects)
 * and recording falls back to the next MIME-ladder rung.
 */
export const RECORDING_WATCHDOG_MS = 2500;

/** User-facing error when every MIME-ladder rung failed to produce video. */
export const RECORDING_ERROR_UNSUPPORTED =
  'Recording is not supported on this device or browser.';

/** User-facing error when a recording finished without producing any data. */
export const RECORDING_ERROR_EMPTY = 'Recording produced no video — please try again.';

/** User-facing error when the native share sheet fails to open or share. */
export const RECORDING_ERROR_SHARE = 'Sharing failed — use Save instead.';
