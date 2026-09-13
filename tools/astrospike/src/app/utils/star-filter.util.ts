import { DetectionOptions, SourceMeasurement } from '../models/detection.types';

/**
 * Decides whether a measured source looks like a real star.
 *
 * Hard rejections first: sources smaller than `minArea` (hot pixels) or with
 * `peak / flux` above `maxPeakFluxRatio` (single-pixel artifacts) never pass.
 *
 * Then two acceptance paths:
 * - **Compact fast path** — area within `maxArea` and elongation within
 *   `maxElongation`: the ordinary star.
 * - **Concentrated path** — everything else (too large, or too elongated) is
 *   accepted only when it is bright (`peak >= extendedMinPeak` — faint noise
 *   clumps are trivially concentrated and must not qualify) and
 *   `concentration >= minConcentration`. This is what
 *   admits bright saturated stars and stars whose own diffraction arms
 *   inflate or elongate their blob, while still rejecting galaxies and
 *   satellite trails: a star keeps most of its flux packed around its peak,
 *   an extended object does not. Elongation alone cannot make this call —
 *   a star with one long arm measures as elongated as an edge-on galaxy.
 *
 * Boundary values are accepted — only strict violations reject.
 *
 * @param m Measurement of the candidate source.
 * @param opts Detection thresholds to test against.
 * @returns True when the source passes as a star.
 */
export function isValidSource(m: SourceMeasurement, opts: DetectionOptions): boolean {
  if (m.area < opts.minArea) {
    return false;
  }
  if (m.peak / m.flux > opts.maxPeakFluxRatio) {
    return false;
  }
  if (m.area <= opts.maxArea && m.elongation <= opts.maxElongation) {
    return true;
  }
  return m.peak >= opts.extendedMinPeak && m.concentration >= opts.minConcentration;
}
