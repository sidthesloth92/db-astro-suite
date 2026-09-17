import {
  COMET_STREAK_MAX_SPREAD,
  COMET_STREAK_MIN_LENGTH,
  cometStreakLength,
  cometStreakOffset,
} from './comet-streak.util';

describe('cometStreakOffset', () => {
  it("should keep the design's -16 / 0 / 16 fan for three bands", () => {
    expect([0, 1, 2].map((i) => cometStreakOffset(i, 3))).toEqual([-16, 0, 16]);
  });

  it('should hold seven bands inside the spread, evenly spaced about the centre', () => {
    const offsets = Array.from({ length: 7 }, (_unused, i) => cometStreakOffset(i, 7));
    expect(offsets[0]).toBeCloseTo(-COMET_STREAK_MAX_SPREAD);
    expect(offsets[3]).toBeCloseTo(0);
    expect(offsets[6]).toBeCloseTo(COMET_STREAK_MAX_SPREAD);
    expect(offsets[1] - offsets[0]).toBeCloseTo(offsets[6] - offsets[5]);
  });

  it('should centre a single band on the tail', () => {
    expect(cometStreakOffset(0, 1)).toBe(0);
  });
});

describe('cometStreakLength', () => {
  it('should scale a streak with its share of the night', () => {
    expect(cometStreakLength(0.5)).toBe(130);
  });

  it('should not draw a streak shorter than the minimum for a tiny share', () => {
    expect(cometStreakLength(0.03)).toBe(COMET_STREAK_MIN_LENGTH);
  });
});
