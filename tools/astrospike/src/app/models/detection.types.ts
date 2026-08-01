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
  /**
   * Fraction of the component's flux lying within `concentrationRadius` of its
   * peak pixel (0..1). Point sources stay high even when their own diffraction
   * arms inflate the blob; galaxies and satellite trails spread flux out and
   * score low. This is what separates a bright star from an extended object —
   * elongation alone cannot (a star with one long arm measures as elongated as
   * a galaxy).
   */
  concentration: number;
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
  /**
   * Pixel count above which the compact-source fast path no longer applies;
   * larger components must qualify through flux concentration instead.
   */
  maxArea: number;
  /**
   * Hard component size cap: labelling consumes but never returns anything
   * bigger. Bounds per-component memory against nebula sheets and gradients.
   */
  maxAreaHard: number;
  /** Maximum elongation for the compact-source fast path. */
  maxElongation: number;
  /** Maximum allowed peak/flux ratio; rejects single-pixel artifacts. */
  maxPeakFluxRatio: number;
  /**
   * Minimum flux concentration for sources that fail the compact fast path
   * (too large or too elongated). Saturated stars and stars with their own
   * diffraction arms pass; galaxies and satellite trails do not.
   */
  minConcentration: number;
  /**
   * Minimum floor radius (detection-scale px) of the disc concentration is
   * measured over. The effective disc grows with the source's near-peak core
   * (by pixel count, so scattered bright noise along a trail cannot inflate
   * it) so heavily saturated plateaus are not penalised.
   */
  concentrationRadius: number;
  /**
   * Minimum background-subtracted peak for the concentration path. Only
   * genuinely bright sources produce plateaus and their own diffraction arms;
   * without this floor, tiny elongated noise clumps (trivially "concentrated")
   * would slip through.
   */
  extendedMinPeak: number;
  /** Maximum number of stars kept after flux-descending sort. */
  maxStars: number;
}
