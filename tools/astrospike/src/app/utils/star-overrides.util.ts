import { DetectedStar } from '../models/detected-star.model';

/**
 * Selects the stars that should receive spikes, combining the brightness cut
 * with per-star manual overrides.
 *
 * By default the first `cutCount` stars of the flux-descending list are kept.
 * An override entry keyed by star id wins over the cut: `true` force-includes
 * a star beyond the cut, `false` force-excludes one inside it. The input
 * array is never mutated; a new filtered array is returned.
 */
export function applyOverrides(
  stars: readonly DetectedStar[],
  cutCount: number,
  overrides: ReadonlyMap<number, boolean>,
): DetectedStar[] {
  return stars.filter((s, i) => overrides.get(s.id) ?? i < cutCount);
}
