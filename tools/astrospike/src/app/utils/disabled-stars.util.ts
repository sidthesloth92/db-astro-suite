import { DetectedStar } from '../models/detected-star.model';

/**
 * Selects the stars the user has manually switched off: those inside the
 * current brightness cut (the first `visibleCount` of the flux-descending
 * list) that are nevertheless absent from the rendered set.
 *
 * These are the only stars worth marking as disabled — a star outside the cut
 * is already dark for everyone, so marking it would say nothing about a user
 * decision. Neither input array is mutated.
 */
export function selectDisabledStars(
  stars: readonly DetectedStar[],
  visibleCount: number,
  renderedStars: readonly DetectedStar[],
): DetectedStar[] {
  if (stars.length === 0 || visibleCount <= 0) {
    return [];
  }
  const renderedIds = new Set(renderedStars.map((star) => star.id));
  return stars.slice(0, visibleCount).filter((star) => !renderedIds.has(star.id));
}
