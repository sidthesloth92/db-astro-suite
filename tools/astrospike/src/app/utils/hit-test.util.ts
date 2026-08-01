import { DetectedStar } from '../models/detected-star.model';

/**
 * Finds the star nearest to a point in full-resolution image pixels.
 *
 * Performs a linear scan over ALL stars using squared distances. Only stars
 * strictly closer than `maxDistance` qualify (the boundary is exclusive);
 * when several stars are equally near, the first one in the list wins.
 * Returns `null` when no star qualifies.
 */
export function findNearestStar(
  stars: readonly DetectedStar[],
  x: number,
  y: number,
  maxDistance: number,
): DetectedStar | null {
  let best: DetectedStar | null = null;
  let bestDistSq = maxDistance * maxDistance;
  for (const star of stars) {
    const dx = star.x - x;
    const dy = star.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      best = star;
      bestDistSq = distSq;
    }
  }
  return best;
}
