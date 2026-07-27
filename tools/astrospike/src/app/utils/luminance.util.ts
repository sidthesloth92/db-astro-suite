import { LuminanceImage } from '../models/detection.types';

/**
 * Converts an RGBA byte buffer to a single-channel Rec.709 luminance plane.
 *
 * Each output value is Y = 0.2126 * R + 0.7152 * G + 0.0722 * B computed from
 * the corresponding RGBA pixel; the alpha channel is ignored.
 *
 * @param rgba Row-major RGBA bytes, length = width * height * 4.
 * @param width Image width in pixels.
 * @param height Image height in pixels.
 * @returns A luminance plane of length width * height.
 */
export function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): LuminanceImage {
  const pixelCount = width * height;
  const data = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    data[i] = 0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2];
  }
  return { data, width, height };
}
