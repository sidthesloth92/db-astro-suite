import { DetectionOptions } from '../models/detection.types';

/**
 * Default tuning parameters for the star detection pipeline, chosen for
 * typical deep-sky astrophotography frames.
 *
 * The concentration values were derived by measuring synthetic fields modeled
 * on a real problem report: a saturated star with its own asymmetric
 * diffraction arms measures elongation ~2.8 — the same as an M82-like galaxy —
 * so elongation cannot separate them. Flux concentration can: the star scores
 * ~0.6+, the galaxy ~0.15, a satellite trail ~0.06.
 */
export const DETECTION_OPTIONS: DetectionOptions = {
  maxDimension: 1536,
  kSigma: 4,
  tileSize: 64,
  minArea: 2,
  maxArea: 400,
  // The whole detection plane: with seed extraction handling any component
  // size gracefully, dropping a big component would silently drop every star
  // inside it (a nebula-rich frame can connect 20%+ of the plane into one
  // component). The cap survives only as a pathological-input memory bound.
  maxAreaHard: 1536 * 1536,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.92,
  minConcentration: 0.35,
  concentrationRadius: 8,
  extendedMinPeak: 100,
  maxStars: 4000,
};

/**
 * Radius (detection px) a seed must dominate for it to count as one star's
 * maximum: no brighter pixel may sit within this disc. Also the spacing below
 * which equal-weight plateau maxima collapse into one seed.
 */
export const SEED_DOMINANCE_RADIUS_PX = 6;

/**
 * Fraction of a seed's weight at which its neighbourhood region is grown. At
 * half-weight a star's region is its own core and inner halo, while a galaxy
 * nucleus grows into the surrounding bar and a trail seed grows into the
 * line — which is what the shape gates below reject.
 */
export const SEED_GROW_FRACTION = 0.5;

/**
 * Maximum elongation of a seed's half-weight region for the seed to be a
 * star. Measured on real frames: star regions stay below ~1.55 even when the
 * star drags its own diffraction arms, M82's nucleus knots measure 2.08, and
 * trails measure in the hundreds.
 */
export const SEED_REGION_MAX_ELONGATION = 1.8;

/**
 * Size backstop (detection px) for a seed's half-weight region. The biggest
 * genuine star region measured on a real frame is ~620 px; galaxy bars run to
 * several thousand.
 */
export const SEED_REGION_MAX_AREA_PX = 2000;

/**
 * Radius (detection px) of the fixed disc whose background-subtracted flux
 * ranks a seed star for spike length. A saturated star's half-weight region
 * can be tiny at detection scale, so the region sum would under-rank the
 * visually biggest stars.
 */
export const SEED_FLUX_RADIUS_PX = 12;

/**
 * Width (detection px) of the ring just outside the flux disc whose median
 * weight is subtracted as a pedestal from every disc pixel. This is what
 * stops a faint star beside a bright one from inheriting the neighbour's
 * halo through the disc and earning a huge spike next to the wrong star.
 */
export const SEED_FLUX_ANNULUS_PX = 3;

/**
 * Weight fraction of the peak that counts as the near-peak core when sizing
 * the adaptive concentration disc.
 */
export const CONCENTRATION_PLATEAU_FRACTION = 0.9;

/**
 * Multiplier applied to the core's area-equivalent radius when sizing the
 * adaptive concentration disc.
 */
export const CONCENTRATION_RADIUS_SCALE = 1.5;

/**
 * Cap on the full-resolution refinement window radius. Big saturated stars can
 * produce detection blobs whose derived window would otherwise reach several
 * hundred pixels a side, and refinement cost is quadratic in the radius.
 */
export const REFINE_WINDOW_RADIUS_MAX = 128;

/**
 * Weight fraction of the peak that counts as the saturated plateau when the
 * refinement centroid picks its core region around the peak pixel.
 */
export const REFINE_PLATEAU_FRACTION = 0.9;

/**
 * Multiplier applied to the plateau's area-equivalent radius when sizing the
 * refinement core region. The radius comes from the near-peak pixel COUNT,
 * never from pixel distances — a lone bright noise pixel or a similar
 * neighbour elsewhere in the window must not balloon the core back into a
 * whole-window centroid.
 */
export const REFINE_CORE_RADIUS_SCALE = 1.5;

/**
 * Padding (px) added around the measured plateau radius to form the
 * refinement core region.
 */
export const REFINE_CORE_PADDING_PX = 3;

/**
 * Radius (px) around the approximate position the anchor peak is searched in
 * first. Detection's centroid is at worst a few pixels off its star, so the
 * true peak is nearby; searching the whole window instead lets a brighter
 * neighbour capture the anchor.
 */
export const REFINE_ANCHOR_RADIUS_PX = 12;

/**
 * Minimum weight of the near-approx anchor, as a fraction of the window's
 * global peak, for it to be trusted. Below this the approximate position is
 * assumed to have missed the star and the global peak is used instead.
 */
export const REFINE_ANCHOR_MIN_PEAK_FRACTION = 0.15;

/** Smallest refinement core radius, so tiny stars still gather enough pixels. */
export const REFINE_CORE_RADIUS_MIN_PX = 4;

/**
 * Centroid weights below this many local noise sigmas are dropped. Rectified
 * noise (max(0, luma - background)) averages ~0.4 sigma per background pixel,
 * and the core disc holds far more background pixels than star pixels for a
 * faint star — without the floor that pedestal drags the centroid toward the
 * disc's integer anchor, visibly de-centring faint spikes on low-resolution
 * frames. Star cores sit many sigmas up and are untouched.
 */
export const REFINE_WEIGHT_MIN_SIGMAS = 1;

/** Converts a median absolute deviation into a Gaussian-equivalent sigma. */
export const REFINE_MAD_SIGMA_SCALE = 1.4826;
