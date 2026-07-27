import { StarColor } from '../models/detected-star.model';
import { RefinedStar } from '../models/detection.types';

/**
 * Computes the Rec.709 luma of the RGBA pixel at flat pixel index `idx`.
 */
function lumaAt(rgba: Uint8ClampedArray, idx: number): number {
  const offset = idx * 4;
  return 0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2];
}

/**
 * Returns the median of a number array without mutating it. Even lengths
 * average the two central values; an empty array yields 0.
 */
function medianOf(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Refines an approximate star position on the full-resolution RGBA image.
 *
 * A square window of `windowRadius` around the rounded approximate position
 * (clamped to the image bounds) is examined; luma is computed per pixel on
 * the fly — no full-resolution luminance plane is ever allocated. The local
 * background is the median luma of the window BORDER pixels; per-pixel
 * weights are `max(0, luma - localBackground)` and yield the refined
 * sub-pixel centroid and the peak. The star color is the luma-weighted mean
 * RGB over window pixels whose weight exceeds 50% of the peak, excluding
 * pixels with any channel at 255 whenever at least one unsaturated
 * qualifying pixel exists, then normalized so the brightest channel is 255.
 * When no pixel qualifies (or the window is empty) the color falls back to
 * white and the approximate position is returned unchanged.
 *
 * @param rgba Row-major full-resolution RGBA bytes, length = width * height * 4.
 * @param width Full-resolution image width in pixels.
 * @param height Full-resolution image height in pixels.
 * @param approxX Approximate star x in full-resolution pixels.
 * @param approxY Approximate star y in full-resolution pixels.
 * @param windowRadius Half-size of the refinement window in pixels.
 * @returns Refined sub-pixel centroid, background-subtracted peak, and color.
 */
export function refineStar(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  approxX: number,
  approxY: number,
  windowRadius: number,
): RefinedStar {
  const whiteFallback: StarColor = { r: 255, g: 255, b: 255 };
  const centerX = Math.round(approxX);
  const centerY = Math.round(approxY);
  const x0 = Math.max(0, centerX - windowRadius);
  const x1 = Math.min(width - 1, centerX + windowRadius);
  const y0 = Math.max(0, centerY - windowRadius);
  const y1 = Math.min(height - 1, centerY + windowRadius);
  if (x1 < x0 || y1 < y0) {
    return { x: approxX, y: approxY, peak: 0, color: whiteFallback };
  }

  // Local background: median luma of the window border pixels.
  const borderLumas: number[] = [];
  for (let x = x0; x <= x1; x++) {
    borderLumas.push(lumaAt(rgba, y0 * width + x));
    if (y1 !== y0) {
      borderLumas.push(lumaAt(rgba, y1 * width + x));
    }
  }
  for (let y = y0 + 1; y < y1; y++) {
    borderLumas.push(lumaAt(rgba, y * width + x0));
    if (x1 !== x0) {
      borderLumas.push(lumaAt(rgba, y * width + x1));
    }
  }
  const localBackground = medianOf(borderLumas);

  // Weighted re-centroid and peak over the window.
  let weightSum = 0;
  let weightedX = 0;
  let weightedY = 0;
  let peak = 0;
  for (let y = y0; y <= y1; y++) {
    const row = y * width;
    for (let x = x0; x <= x1; x++) {
      const w = Math.max(0, lumaAt(rgba, row + x) - localBackground);
      weightSum += w;
      weightedX += w * x;
      weightedY += w * y;
      if (w > peak) {
        peak = w;
      }
    }
  }
  const refinedX = weightSum > 0 ? weightedX / weightSum : approxX;
  const refinedY = weightSum > 0 ? weightedY / weightSum : approxY;

  // Color: luma-weighted mean RGB over bright core pixels, preferring
  // unsaturated pixels (no channel at 255) when any exist.
  const coreThreshold = peak * 0.5;
  let allW = 0;
  let allR = 0;
  let allG = 0;
  let allB = 0;
  let unsatW = 0;
  let unsatR = 0;
  let unsatG = 0;
  let unsatB = 0;
  for (let y = y0; y <= y1; y++) {
    const row = y * width;
    for (let x = x0; x <= x1; x++) {
      const idx = row + x;
      const w = Math.max(0, lumaAt(rgba, idx) - localBackground);
      if (w <= 0 || w <= coreThreshold) {
        continue;
      }
      const offset = idx * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      allW += w;
      allR += w * r;
      allG += w * g;
      allB += w * b;
      if (r !== 255 && g !== 255 && b !== 255) {
        unsatW += w;
        unsatR += w * r;
        unsatG += w * g;
        unsatB += w * b;
      }
    }
  }

  const chosenW = unsatW > 0 ? unsatW : allW;
  if (chosenW <= 0) {
    return { x: refinedX, y: refinedY, peak, color: whiteFallback };
  }
  const meanR = (unsatW > 0 ? unsatR : allR) / chosenW;
  const meanG = (unsatW > 0 ? unsatG : allG) / chosenW;
  const meanB = (unsatW > 0 ? unsatB : allB) / chosenW;
  const maxChannel = Math.max(meanR, meanG, meanB);
  if (maxChannel <= 0) {
    return { x: refinedX, y: refinedY, peak, color: whiteFallback };
  }
  const scaleToFull = 255 / maxChannel;
  const color: StarColor = {
    r: Math.round(meanR * scaleToFull),
    g: Math.round(meanG * scaleToFull),
    b: Math.round(meanB * scaleToFull),
  };
  return { x: refinedX, y: refinedY, peak, color };
}
