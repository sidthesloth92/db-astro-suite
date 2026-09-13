import { FLUX_REF_RANK } from '../constants/spike-geometry.constants';
import { DetectedStar } from '../models/detected-star.model';

/**
 * Picks the flux that anchors every star's relative spike scale from a
 * flux-descending star list: the `FLUX_REF_RANK`-th brightest star (or the
 * faintest available when fewer exist). Anchoring on the single brightest
 * source lets one monster star or a detected galaxy core drag every other
 * star's spikes toward the floor; a fixed small rank is robust to a few such
 * outliers while staying independent of the field's star count.
 *
 * @param stars Detected stars sorted by flux descending.
 * @returns The reference flux, or 0 for an empty list.
 */
export function fluxReferenceFor(stars: readonly DetectedStar[]): number {
  if (stars.length === 0) {
    return 0;
  }
  return stars[Math.min(FLUX_REF_RANK - 1, stars.length - 1)].flux;
}
