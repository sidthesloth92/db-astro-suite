import { DetectionOptions } from '../models/detection.types';

/**
 * Default tuning parameters for the star detection pipeline, chosen for
 * typical deep-sky astrophotography frames.
 */
export const DETECTION_OPTIONS: DetectionOptions = {
  maxDimension: 1536,
  kSigma: 4,
  tileSize: 64,
  minArea: 2,
  maxArea: 400,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.92,
  maxStars: 4000,
};
