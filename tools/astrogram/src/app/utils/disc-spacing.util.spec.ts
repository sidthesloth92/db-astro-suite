import { separateDiscs } from './disc-spacing.util';

describe('separateDiscs', () => {
  it('should leave discs that already clear each other at their own size', () => {
    expect(separateDiscs([164, 332, 416], [24.4, 14.7, 11.8], 2, 3, 33)).toEqual([24.4, 14.7, 11.8]);
  });

  it('should shrink crowded neighbours until they no longer overlap', () => {
    const centres = [413, 426.4, 440];
    const radii = separateDiscs(centres, [8, 8, 8], 2, 3, 33);

    radii.slice(1).forEach((r, i) => {
      expect(centres[i + 1] - centres[i]).toBeGreaterThanOrEqual(radii[i] + r + 2 - 1e-9);
    });
  });

  it('should keep the first disc clear of whatever sits before the row', () => {
    expect(separateDiscs([45, 200], [10, 10], 2, 3, 33)).toEqual([10, 10]);
    expect(separateDiscs([40, 200], [10, 10], 2, 3, 33)).toEqual([5, 10]);
  });

  it('should never shrink a disc below the minimum radius', () => {
    expect(separateDiscs([100, 101], [8, 8], 2, 3, 33)).toEqual([3, 3]);
  });

  it('should return nothing for no discs', () => {
    expect(separateDiscs([], [], 2, 3, 33)).toEqual([]);
  });
});
