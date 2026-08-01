import { REFINE_WINDOW_RADIUS_MAX } from '../constants/detection.constants';
import { DetectedStar } from '../models/detected-star.model';
import { DetectionOptions, SourceMeasurement } from '../models/detection.types';
import { estimateBackground } from './background.util';
import { labelComponents } from './connected-components.util';
import { downsampleLuminanceFromRgba } from './downsample.util';
import { isValidSource } from './star-filter.util';
import { measureSource } from './star-measure.util';
import { refineStar } from './star-refine.util';
import { extractSeedStars } from './star-seeds.util';
import { thresholdMask } from './threshold.util';

/**
 * Runs the full star detection pipeline over a full-resolution RGBA image.
 *
 * The image is converted to Rec.709 luminance and downsampled in one pass so
 * its larger dimension does not exceed `opts.maxDimension` (fused so a
 * full-resolution luminance plane is never allocated — on a 60+ megapixel frame
 * that plane alone would cost hundreds of megabytes), background-modeled with a
 * `opts.tileSize` mesh, thresholded at `opts.kSigma` sigma, and segmented
 * into 8-connected components (only components beyond `opts.maxAreaHard` are
 * consumed but dropped — that cap is purely a memory bound). Components within
 * `opts.maxArea` are measured whole and filtered by `isValidSource`. Bigger
 * components are mixtures — a saturated star plus its halo and arms, several
 * stars merged with the nebulosity that connects them, a galaxy, or a trail —
 * so they are never judged whole: `extractSeedStars` recovers the individual
 * stars inside them and rejects the rest. Every candidate is mapped back to
 * approximate full-resolution coordinates (`(c + 0.5) * factor - 0.5`) and
 * refined at full resolution with a window radius of
 * `max(4, round(2 * sqrt(area) * factor))`. Results keep the detection-scale
 * flux/area/elongation and the refined x/y/peak/color, are sorted by flux
 * descending, capped at `opts.maxStars`, and assigned ids equal to their
 * index in the sorted list.
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
  // Labelling only enforces the HARD cap; the nuanced star-vs-junk calls
  // (which need measurements) happen per component below. Capping at maxArea
  // here would silently consume big saturated stars before they could ever be
  // measured.
  const components = labelComponents(mask, image.width, image.height, opts.maxAreaHard);

  const candidates: Omit<DetectedStar, 'id'>[] = [];
  const pushCandidate = (measurement: SourceMeasurement): void => {
    const approxX = (measurement.cx + 0.5) * factor - 0.5;
    const approxY = (measurement.cy + 0.5) * factor - 0.5;
    const windowRadius = Math.min(
      REFINE_WINDOW_RADIUS_MAX,
      Math.max(4, Math.round(2 * Math.sqrt(measurement.area) * factor)),
    );
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
  };

  for (const component of components) {
    if (component.count > opts.maxArea) {
      for (const seed of extractSeedStars(component, image, background, opts)) {
        pushCandidate(seed);
      }
      continue;
    }
    const measurement = measureSource(component, image, background, opts.concentrationRadius);
    if (isValidSource(measurement, opts)) {
      pushCandidate(measurement);
    }
  }

  return candidates
    .slice()
    .sort((a, b) => b.flux - a.flux)
    .slice(0, Math.max(0, opts.maxStars))
    .map((star, index) => ({ id: index, ...star }));
}
