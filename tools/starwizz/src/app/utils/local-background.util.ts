import { LocalBackground } from '../models/star-lift.model';

/**
 * Estimates the background level and noise around every pixel of a brightness image. The image
 * is cut into blocks; each block's median is its background and its median absolute deviation
 * its noise (both robust against the stars inside it). Block values are then interpolated back
 * to full size so thresholds change smoothly across the frame.
 *
 * @param lum - Brightness per pixel, 0..1
 * @param width - Image width in px
 * @param height - Image height in px
 * @param block - Block size in px
 */
export function estimateLocalBackground(
  lum: Float32Array,
  width: number,
  height: number,
  block: number,
): LocalBackground {
  const blocksX = Math.ceil(width / block);
  const blocksY = Math.ceil(height / block);
  const medians = new Float32Array(blocksX * blocksY);
  const sigmas = new Float32Array(blocksX * blocksY);
  const values: number[] = [];

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      values.length = 0;
      const x1 = Math.min(width, (bx + 1) * block);
      const y1 = Math.min(height, (by + 1) * block);
      // Every second pixel is plenty for a median and quarters the work.
      for (let y = by * block; y < y1; y += 2) {
        for (let x = bx * block; x < x1; x += 2) {
          values.push(lum[y * width + x]);
        }
      }
      values.sort((a, b) => a - b);
      const median = values[values.length >> 1];
      const deviations = values.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
      medians[by * blocksX + bx] = median;
      // 1.4826 turns a median absolute deviation into a standard deviation for normal noise.
      sigmas[by * blocksX + bx] = 1.4826 * deviations[deviations.length >> 1] + 1e-4;
    }
  }

  return {
    background: upsampleBilinear(medians, blocksX, blocksY, width, height),
    sigma: upsampleBilinear(sigmas, blocksX, blocksY, width, height),
  };
}

/**
 * Stretches a small single-channel image to a larger size with bilinear interpolation,
 * treating each source value as sitting at the centre of its cell.
 */
export function upsampleBilinear(
  source: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(sourceHeight - 1, Math.max(0, ((y + 0.5) / height) * sourceHeight - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(sourceWidth - 1, Math.max(0, ((x + 0.5) / width) * sourceWidth - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const tx = fx - x0;
      const top = source[y0 * sourceWidth + x0] * (1 - tx) + source[y0 * sourceWidth + x1] * tx;
      const bottom = source[y1 * sourceWidth + x0] * (1 - tx) + source[y1 * sourceWidth + x1] * tx;
      out[y * width + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}
