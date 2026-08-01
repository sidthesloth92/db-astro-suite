import { DetectedStar } from '../models/detected-star.model';
import { findNearestStar } from './hit-test.util';

/** Builds a minimal DetectedStar at the given position for these specs. */
function makeStar(id: number, x: number, y: number): DetectedStar {
  return {
    id,
    x,
    y,
    flux: 1000 - id,
    peak: 100,
    area: 9,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

describe('hit-test.util', () => {
  describe('findNearestStar', () => {
    it('should return the nearest star when several are in range', () => {
      const stars = [makeStar(0, 100, 100), makeStar(1, 110, 100), makeStar(2, 200, 200)];
      const hit = findNearestStar(stars, 108, 100, 50);
      expect(hit?.id).toBe(1);
    });

    it('should treat maxDistance as an exclusive boundary', () => {
      const stars = [makeStar(0, 100, 100)];
      // Star exactly 10 px away from the probe point.
      expect(findNearestStar(stars, 110, 100, 10)).toBeNull();
      // Just inside the boundary it qualifies.
      expect(findNearestStar(stars, 110, 100, 10.001)?.id).toBe(0);
    });

    it('should return null for an empty star list', () => {
      expect(findNearestStar([], 50, 50, 100)).toBeNull();
    });

    it('should keep the first star on an exact distance tie', () => {
      // Both stars are exactly 5 px from (100, 100).
      const stars = [makeStar(0, 95, 100), makeStar(1, 105, 100)];
      expect(findNearestStar(stars, 100, 100, 20)?.id).toBe(0);
    });

    it('should scan all stars, not just the first in-range one', () => {
      // A far-but-in-range star first, the true nearest last.
      const stars = [makeStar(0, 140, 100), makeStar(1, 101, 100)];
      expect(findNearestStar(stars, 100, 100, 50)?.id).toBe(1);
    });
  });
});
