import { hourTicksFor } from './hour-ticks.util';

describe('hourTicksFor', () => {
  it("should reproduce the design's 2-hour ticks for a 10h 20m session", () => {
    expect(hourTicksFor(10 + 20 / 60)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('should move to a coarser step when a long session would need too many ticks', () => {
    expect(hourTicksFor(14.5)).toEqual([0, 3, 6, 9, 12]);
  });

  it('should use half-hour ticks for a short session', () => {
    expect(hourTicksFor(2.2)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it('should include a tick that lands exactly on the total', () => {
    expect(hourTicksFor(6)).toEqual([0, 2, 4, 6]);
  });

  it('should return no ticks for an empty session', () => {
    expect(hourTicksFor(0)).toEqual([]);
  });
});
