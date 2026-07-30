import { DetectedStar } from '../models/detected-star.model';

/**
 * Chooses the flux to record for a hand-placed star by borrowing it from the
 * detected star of most similar peak brightness.
 *
 * Flux drives how long and bright a spike is drawn, and it is measured at
 * detection scale — on the downsampled image — so a value measured at full
 * resolution cannot be compared against it directly. Peak brightness IS
 * comparable: detection refines every star's peak on the full-resolution
 * image, exactly as a hand-placed star is measured. Matching on peak therefore
 * borrows a flux from the same image's own brightness-to-flux relationship
 * rather than inventing one, which is what makes a placed star spike like the
 * real stars around it.
 *
 * @param stars The detected stars, any order.
 * @param peak Full-resolution background-subtracted peak of the placed star.
 * @returns The matched flux, or 0 when there are no detected stars to match.
 */
export function fluxForManualPeak(stars: readonly DetectedStar[], peak: number): number {
  if (stars.length === 0) {
    return 0;
  }
  let matched = stars[0];
  let smallestDelta = Math.abs(matched.peak - peak);
  for (const star of stars) {
    const delta = Math.abs(star.peak - peak);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      matched = star;
    }
  }
  return matched.flux;
}

/**
 * Returns the index at which `flux` belongs in a flux-descending star list.
 *
 * A placed star is inserted rather than appended so the brightness cut treats
 * it by brightness like every other star: the cut keeps the first N entries of
 * this list, so position is what decides whether a star is inside it.
 *
 * @param stars Stars already sorted by descending flux.
 * @param flux Flux of the star being inserted.
 */
export function fluxSortedInsertIndex(stars: readonly DetectedStar[], flux: number): number {
  let index = 0;
  while (index < stars.length && stars[index].flux > flux) {
    index++;
  }
  return index;
}
