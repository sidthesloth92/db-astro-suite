import { leaderPoints } from './label-leader.util';

describe('leaderPoints', () => {
  it('should draw no line for a label that sits on its mark', () => {
    expect(leaderPoints(200, 202, 130, 150, 165, 4)).toBeNull();
  });

  it('should run from the mark, bend at the knee and end at a displaced label', () => {
    expect(leaderPoints(413, 384, 130, 150, 165, 4)).toBe('413,130 413,150 384,165');
  });

  it('should work for a label above the mark', () => {
    expect(leaderPoints(426, 446, 100, 90, 76, 4)).toBe('426,100 426,90 446,76');
  });

  it('should keep the knee between the start and the end', () => {
    expect(leaderPoints(426, 446, 85, 90, 76, 4)).toBe('426,85 426,85 446,76');
    expect(leaderPoints(413, 384, 130, 170, 165, 4)).toBe('413,130 413,165 384,165');
  });
});
