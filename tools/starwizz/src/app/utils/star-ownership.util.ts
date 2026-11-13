import { LiftStar, StarGroup, StarOwnership } from '../models/star-lift.model';

/**
 * Decides which lifted cut-out owns each pixel. Stars are painted as discs, brightest first. A
 * fainter star whose centre already belongs to a brighter star's disc is absorbed into that
 * cut-out, so a faint companion travels with its bright neighbour instead of being split.
 *
 * Each star's `group` is set to the index of the cut-out it ended up in.
 *
 * @param stars - Detected stars, brightest first
 * @returns The per-pixel owner map (-1 = backdrop) and the cut-out bounds
 */
export function buildOwnership(stars: LiftStar[], width: number, height: number): StarOwnership {
  const owner = new Int32Array(width * height).fill(-1);
  const groups: StarGroup[] = [];

  for (const star of stars) {
    const centreOwner = owner[star.y * width + star.x];
    let groupIndex = centreOwner;
    if (centreOwner < 0) {
      groupIndex = groups.length;
      groups.push({ x0: star.x, y0: star.y, x1: star.x, y1: star.y });
    }
    star.group = groupIndex;
    const group = groups[groupIndex];

    const r = star.rHalo;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const y = star.y + dy;
      if (y < 0 || y >= height) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = star.x + dx;
        if (x < 0 || x >= width || dx * dx + dy * dy > r2) continue;
        const i = y * width + x;
        if (owner[i] !== -1) continue;
        owner[i] = groupIndex;
        if (x < group.x0) group.x0 = x;
        if (x > group.x1) group.x1 = x;
        if (y < group.y0) group.y0 = y;
        if (y > group.y1) group.y1 = y;
      }
    }
  }
  return { owner, groups };
}
