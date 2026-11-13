import { DownsampleResult, LuminanceImage } from '../models/detection.types';
import { REC709_B, REC709_G, REC709_R } from '../constants/luminance.constants';

/**
 * Returns the integer downsample factor that keeps the larger dimension within
 * `maxDimension`. A factor of 1 means no downsampling is required.
 */
export function downsampleFactorFor(width: number, height: number, maxDimension: number): number {
  return Math.max(1, Math.ceil(Math.max(width, height) / maxDimension));
}

/**
 * Box-average downsamples straight from an RGBA buffer to a luminance plane,
 * without ever materialising a full-resolution luminance plane.
 *
 * This is the path detection uses: on a 60+ megapixel frame the intermediate
 * full-resolution `Float32Array` would cost hundreds of megabytes on top of the
 * pixel buffer itself, which is what pushes low-memory devices over the edge.
 * The result is identical to `downsampleLuminance(toLuminance(...), ...)`.
 *
 * @param rgba Row-major full-resolution RGBA bytes, length = width * height * 4.
 * @param width Full-resolution image width in pixels.
 * @param height Full-resolution image height in pixels.
 * @param maxDimension Maximum allowed dimension of the downsampled plane.
 * @returns The downsampled luminance plane together with the factor applied.
 */
export function downsampleLuminanceFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maxDimension: number,
): DownsampleResult {
  const factor = downsampleFactorFor(width, height, maxDimension);
  const outWidth = Math.ceil(width / factor);
  const outHeight = Math.ceil(height / factor);
  const out = new Float32Array(outWidth * outHeight);

  for (let oy = 0; oy < outHeight; oy++) {
    const yStart = oy * factor;
    const yEnd = Math.min(yStart + factor, height);
    for (let ox = 0; ox < outWidth; ox++) {
      const xStart = ox * factor;
      const xEnd = Math.min(xStart + factor, width);
      let sum = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y++) {
        const rowOffset = y * width;
        for (let x = xStart; x < xEnd; x++) {
          const offset = (rowOffset + x) * 4;
          sum += REC709_R * rgba[offset] + REC709_G * rgba[offset + 1] + REC709_B * rgba[offset + 2];
          count++;
        }
      }
      out[oy * outWidth + ox] = sum / count;
    }
  }

  return { image: { data: out, width: outWidth, height: outHeight }, factor };
}
