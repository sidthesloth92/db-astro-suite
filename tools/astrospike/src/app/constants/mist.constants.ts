import { MistProfile } from '../models/mist-profile.model';

/**
 * The mist every preset draws when the Mist control is raised.
 *
 * Tuned against the same reference Milky Way widefields as the Glow halo:
 * the galactic core and bright nebulae gain a soft luminous haze that
 * bleeds a few percent of the frame into the dark lanes beside them, while
 * blank sky stays byte-for-byte black. The threshold sits above the sky and
 * the faint carpet (roughly sRGB 100 in linear light), the three scales
 * reach from a tight glow to a wide veil, and the gain is chosen so the
 * Mist slider's midpoint is a clearly visible, still-tasteful effect.
 */
export const DEFAULT_MIST_PROFILE: MistProfile = {
  thresholdLinear: 0.13,
  kneePower: 1.5,
  radiusScales: [0.02, 0.05, 0.12],
  radiusWeights: [0.4, 0.35, 0.25],
  saturationBoost: 1.4,
  gain: 1.6,
  workMaxDimension: 512,
};

/**
 * Passes of the separable box blur used for each mist scale. Three passes of
 * a box approximate a Gaussian closely enough for a haze nobody inspects
 * pixel by pixel, at a fraction of the cost.
 */
export const MIST_BLUR_PASSES = 3;
