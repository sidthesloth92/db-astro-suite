import { StarColor } from './detected-star.model';

/**
 * A single-channel luminance plane stored row-major as Float32 values.
 */
export interface LuminanceImage {
  /** Row-major luminance values, length = width * height. */
  data: Float32Array;
  /** Plane width in pixels. */
  width: number;
  /** Plane height in pixels. */
  height: number;
}

/**
 * Result of box-average downsampling a luminance plane.
 */
export interface DownsampleResult {
  /** The downsampled luminance plane (the source itself when factor is 1). */
  image: LuminanceImage;
  /** Integer downsample factor applied on each axis. */
  factor: number;
}

/**
 * Smooth per-pixel background model plus a global noise estimate.
 */
export interface BackgroundMap {
  /** Bilinearly interpolated per-pixel background, length = width * height. */
  background: Float32Array;
  /** Robust noise sigma (1.4826 * MAD of background-subtracted residuals). */
  sigma: number;
}

/**
 * One connected component of above-threshold pixels at detection resolution.
 */
export interface SourceComponent {
  /** Flat pixel indices (y * width + x) at detection resolution. */
  pixels: Int32Array;
  /** Number of valid entries in `pixels`. */
  count: number;
}

/**
 * Photometric and shape measurements of a single source component.
 */
export interface SourceMeasurement {
  /** Flux-weighted x centroid at detection resolution. */
  cx: number;
  /** Flux-weighted y centroid at detection resolution. */
  cy: number;
  /** Sum of background-subtracted pixel weights. */
  flux: number;
  /** Maximum background-subtracted pixel weight in the component. */
  peak: number;
  /** Pixel count of the component. */
  area: number;
  /** sqrt(l1 / l2) from second central moment eigenvalues; 1 = round. */
  elongation: number;
}

/**
 * Full-resolution refinement of an approximate star position: sub-pixel
 * centroid, peak, and sampled core color.
 */
export interface RefinedStar {
  /** Refined sub-pixel x centroid in full-resolution image pixels. */
  x: number;
  /** Refined sub-pixel y centroid in full-resolution image pixels. */
  y: number;
  /** Local-background-subtracted peak luma inside the refinement window. */
  peak: number;
  /** Luma-weighted mean RGB of unsaturated core pixels, normalized to 255. */
  color: StarColor;
}

/**
 * Tuning parameters for the star detection pipeline.
 */
export interface DetectionOptions {
  /** Maximum detection-plane dimension; larger images are downsampled. */
  maxDimension: number;
  /** Detection threshold in units of background sigma. */
  kSigma: number;
  /** Background mesh tile size in detection-scale pixels. */
  tileSize: number;
  /** Minimum component pixel count for a valid star. */
  minArea: number;
  /** Maximum component pixel count; larger components are discarded. */
  maxArea: number;
  /** Maximum allowed elongation; more elongated sources are rejected. */
  maxElongation: number;
  /** Maximum allowed peak/flux ratio; rejects single-pixel artifacts. */
  maxPeakFluxRatio: number;
  /** Maximum number of stars kept after flux-descending sort. */
  maxStars: number;
}
