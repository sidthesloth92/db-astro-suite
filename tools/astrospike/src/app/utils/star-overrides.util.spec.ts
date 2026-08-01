import { DetectedStar } from '../models/detected-star.model';
import { applyOverrides } from './star-overrides.util';

/** Builds a minimal DetectedStar at the given sorted index for these specs. */
function makeStar(id: number): DetectedStar {
  return {
    id,
    x: id * 10,
    y: id * 5,
    flux: 1000 - id,
    peak: 100,
    area: 9,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

describe('star-overrides.util', () => {
  describe('applyOverrides', () => {
    const stars: readonly DetectedStar[] = [0, 1, 2, 3, 4].map(makeStar);

    it('should keep exactly the first cutCount stars with no overrides', () => {
      const result = applyOverrides(stars, 3, new Map());
      expect(result.map((s) => s.id)).toEqual([0, 1, 2]);
    });

    it('should include a star forced on beyond the cut', () => {
      const result = applyOverrides(stars, 2, new Map([[4, true]]));
      expect(result.map((s) => s.id)).toEqual([0, 1, 4]);
    });

    it('should exclude a star forced off inside the cut', () => {
      const result = applyOverrides(stars, 3, new Map([[1, false]]));
      expect(result.map((s) => s.id)).toEqual([0, 2]);
    });

    it('should honour the same overrides when the cut changes', () => {
      const overrides = new Map([
        [4, true],
        [0, false],
      ]);
      expect(applyOverrides(stars, 1, overrides).map((s) => s.id)).toEqual([4]);
      expect(applyOverrides(stars, 5, overrides).map((s) => s.id)).toEqual([1, 2, 3, 4]);
    });

    it('should never mutate the input array', () => {
      const input = [0, 1, 2].map(makeStar);
      const snapshot = input.map((s) => ({ ...s, color: { ...s.color } }));
      const result = applyOverrides(input, 1, new Map([[0, false]]));
      expect(result).not.toBe(input);
      expect(input).toEqual(snapshot);
    });
  });
});
