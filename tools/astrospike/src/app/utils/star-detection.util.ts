import { DetectedStar } from '../models/detected-star.model';
import { DetectionOptions } from '../models/detection.types';
import { estimateBackground } from './background.util';
import { labelComponents } from './connected-components.util';
import { downsampleLuminanceFromRgba } from './downsample.util';
import { isValidSource } from './star-filter.util';
import { measureSource } from './star-measure.util';
import { refineStar } from './star-refine.util';
import { thresholdMask } from './threshold.util';

/**
 * Runs the full star detection pipeline over a full-resolution RGBA image.
 *
 * The image is converted to Rec.709 luminance and downsampled in one pass so
 * its larger dimension does not exceed `opts.maxDimension` (fused so a
 * full-resolution luminance plane is never allocated — on a 60+ megapixel frame
 * that plane alone would cost hundreds of megabytes), background-modeled with a
 * `opts.tileSize` mesh, thresholded at `opts.kSigma` sigma, and segmented
 * into 8-connected components (components larger than `opts.maxArea` are
 * consumed but dropped). Each surviving component is measured, filtered by
 * `isValidSource`, mapped back to approximate full-resolution coordinates
 * (`(c + 0.5) * factor - 0.5`), and refined at full resolution with a window
 * radius of `max(4, round(2 * sqrt(area) * factor))`. Results keep the
 * detection-scale flux/area/elongation and the refined x/y/peak/color, are
 * sorted by flux descending, capped at `opts.maxStars`, and assigned ids
 * equal to their index in the sorted list.
 *
 * @param rgba Row-major full-resolution RGBA bytes, length = width * height * 4.
 * @param width Full-resolution image width in pixels.
 * @param height Full-resolution image height in pixels.
 * @param opts Detection tuning parameters.
 * @returns Detected stars sorted by flux descending, ids 0..n-1.
 */
export function detectStars(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: DetectionOptions,
): DetectedStar[] {
  const { image, factor } = downsampleLuminanceFromRgba(rgba, width, height, opts.maxDimension);
  const background = estimateBackground(image, opts.tileSize);
  const mask = thresholdMask(image, background, opts.kSigma);
  const components = labelComponents(mask, image.width, image.height, opts.maxArea);

  const candidates: Omit<DetectedStar, 'id'>[] = [];
  for (const component of components) {
    const measurement = measureSource(component, image, background);
    if (!isValidSource(measurement, opts)) {
      continue;
    }
    const approxX = (measurement.cx + 0.5) * factor - 0.5;
    const approxY = (measurement.cy + 0.5) * factor - 0.5;
    const windowRadius = Math.max(4, Math.round(2 * Math.sqrt(measurement.area) * factor));
    const refined = refineStar(rgba, width, height, approxX, approxY, windowRadius);
    candidates.push({
      x: refined.x,
      y: refined.y,
      flux: measurement.flux,
      peak: refined.peak,
      area: measurement.area,
      elongation: measurement.elongation,
      color: refined.color,
    });
  }

  return candidates
    .slice()
    .sort((a, b) => b.flux - a.flux)
    .slice(0, Math.max(0, opts.maxStars))
    .map((star, index) => ({ id: index, ...star }));
}
