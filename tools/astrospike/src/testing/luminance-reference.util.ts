/**
 * Reference implementations of the luminance pipeline, kept for tests only.
 *
 * Production detection uses the fused `downsampleLuminanceFromRgba`, which
 * never materialises a full-resolution luminance plane. These two obvious,
 * separately-testable steps are what that fast path is verified against, so
 * they live outside `src/app` rather than as unreferenced production exports.
 */

import { REC709_B, REC709_G, REC709_R } from '../app/constants/luminance.constants';
import { DownsampleResult, LuminanceImage } from '../app/models/detection.types';

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
    data[i] = REC709_R * rgba[offset] + REC709_G * rgba[offset + 1] + REC709_B * rgba[offset + 2];
  }
  return { data, width, height };
}

/**
 * Box-average downsamples a luminance plane so its largest dimension does not
 * exceed `maxDimension`.
 *
 * The integer factor is Math.ceil(max(width, height) / maxDimension). A factor
 * of 1 returns the source plane as-is (same object, no copy). Otherwise each
 * output pixel is the average of the corresponding factor x factor source
 * block; edge blocks that extend past the image are averaged over the actual
 * number of source pixels they cover.
 *
 * @param src The source luminance plane.
 * @param maxDimension Maximum allowed dimension of the downsampled plane.
 * @returns The downsampled plane together with the factor that was applied.
 */
export function downsampleLuminance(src: LuminanceImage, maxDimension: number): DownsampleResult {
  const factor = Math.ceil(Math.max(src.width, src.height) / maxDimension);
  if (factor <= 1) {
    return { image: src, factor: 1 };
  }

  const outWidth = Math.ceil(src.width / factor);
  const outHeight = Math.ceil(src.height / factor);
  const out = new Float32Array(outWidth * outHeight);

  for (let oy = 0; oy < outHeight; oy++) {
    const yStart = oy * factor;
    const yEnd = Math.min(yStart + factor, src.height);
    for (let ox = 0; ox < outWidth; ox++) {
      const xStart = ox * factor;
      const xEnd = Math.min(xStart + factor, src.width);
      let sum = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y++) {
        const rowOffset = y * src.width;
        for (let x = xStart; x < xEnd; x++) {
          sum += src.data[rowOffset + x];
          count++;
        }
      }
      out[oy * outWidth + ox] = sum / count;
    }
  }

  return { image: { data: out, width: outWidth, height: outHeight }, factor };
}
