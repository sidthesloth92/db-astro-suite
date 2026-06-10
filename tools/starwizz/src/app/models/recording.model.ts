/**
 * Recording quality preset selectable from the record split-button menu.
 * Each preset bundles a capture frame rate and a bitrate budget so users
 * pick an outcome ("Social Media") rather than technical encoder knobs.
 */
export type RecordingPreset = 'social' | 'maximum' | 'compact';

/**
 * Descriptor for a {@link RecordingPreset}: the user-facing copy plus the
 * capture frame rate and per-pixel bitrate budget the encoder is given.
 */
export interface RecordingPresetMetadata {
  /** Short user-facing name shown on the record button and in the menu. */
  label: string;
  /** One-line plain-English description shown under the label in the menu. */
  description: string;
  /**
   * Canvas capture frame rate. Only 30 and 60 are offered — 24 fps was
   * deliberately omitted because fast shooting-star streaks judder without
   * camera-style motion blur, while saving little over 30 fps.
   */
  fps: 30 | 60;
  /**
   * H.264 bitrate budget in bits per pixel per frame. The encoder bitrate is
   * `width × height × fps × bitsPerPixelPerFrame`, clamped to sane bounds, so
   * quality scales automatically with the selected output format.
   */
  bitsPerPixelPerFrame: number;
}
