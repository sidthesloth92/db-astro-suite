import { DetectionOptions, SourceMeasurement } from '../models/detection.types';

/**
 * Decides whether a measured source looks like a real star. Rejects sources
 * that are too small (`area < minArea`, e.g. hot pixels), too large
 * (`area > maxArea`, e.g. nebulosity), too spiky
 * (`peak / flux > maxPeakFluxRatio`, single-pixel artifacts), or too
 * elongated (`elongation > maxElongation`, e.g. satellite trails).
 * Boundary values are accepted — only strict violations reject.
 *
 * @param m Measurement of the candidate source.
 * @param opts Detection thresholds to test against.
 * @returns True when the source passes every threshold.
 */
export function isValidSource(m: SourceMeasurement, opts: DetectionOptions): boolean {
  if (m.area < opts.minArea) {
    return false;
  }
  if (m.area > opts.maxArea) {
    return false;
  }
  if (m.peak / m.flux > opts.maxPeakFluxRatio) {
    return false;
  }
  if (m.elongation > opts.maxElongation) {
    return false;
  }
  return true;
}
