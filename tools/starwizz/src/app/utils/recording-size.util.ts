import {
  MAX_VIDEO_BITS_PER_SECOND,
  MIN_VIDEO_BITS_PER_SECOND,
} from '../constants/recording.constant';
import { RecordingPresetMetadata } from '../models/recording.model';

/**
 * Computes the encoder bitrate (bits per second) for a recording: the
 * preset's bits-per-pixel-per-frame budget scaled by resolution and frame
 * rate, clamped to {@link MIN_VIDEO_BITS_PER_SECOND} / {@link MAX_VIDEO_BITS_PER_SECOND}.
 *
 * @param width - Output canvas width in pixels
 * @param height - Output canvas height in pixels
 * @param preset - Quality preset supplying fps and the per-pixel bit budget
 * @returns The clamped bitrate in bits per second, rounded to an integer
 */
export function computeRecordingBitsPerSecond(
  width: number,
  height: number,
  preset: RecordingPresetMetadata,
): number {
  const raw = width * height * preset.fps * preset.bitsPerPixelPerFrame;
  return Math.round(
    Math.min(MAX_VIDEO_BITS_PER_SECOND, Math.max(MIN_VIDEO_BITS_PER_SECOND, raw)),
  );
}

/**
 * Estimates the file size in megabytes (10^6 bytes) of a recording at the
 * given bitrate and duration, rounded to the nearest whole MB.
 *
 * @param bitsPerSecond - Encoder bitrate in bits per second
 * @param durationSeconds - Clip length in seconds
 * @returns Estimated size in MB
 */
export function estimateRecordingSizeMb(bitsPerSecond: number, durationSeconds: number): number {
  return Math.round((bitsPerSecond * durationSeconds) / 8 / 1_000_000);
}
