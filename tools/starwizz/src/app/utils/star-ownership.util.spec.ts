import { LiftStar } from '../models/star-lift.model';
import { buildOwnership } from './star-ownership.util';

const W = 100;
const H = 80;
const star = (x: number, y: number, peak: number, rHalo: number): LiftStar => ({
  x,
  y,
  peak,
  rHalf: 2,
  rHalo,
});

describe('buildOwnership', () => {
  it('should give each separate star its own cut-out covering its disc', () => {
    const stars = [star(25, 40, 0.9, 6), star(70, 40, 0.5, 4)];
    const { owner, groups, groupOf } = buildOwnership(stars, W, H);

    expect(groups.length).toBe(2);
    expect(Array.from(groupOf)).toEqual([0, 1]);
    expect(owner[40 * W + 25]).toBe(0);
    expect(owner[40 * W + 31]).toBe(0);
    expect(owner[40 * W + 33]).toBe(-1);
    expect(owner[40 * W + 70]).toBe(1);
    expect(groups[0]).toEqual({ x0: 19, y0: 34, x1: 31, y1: 46 });
  });

  it('should absorb a faint star whose centre lies inside a brighter star’s disc', () => {
    const stars = [star(40, 40, 0.9, 10), star(46, 40, 0.3, 5)];
    const { owner, groups, groupOf } = buildOwnership(stars, W, H);

    expect(groups.length).toBe(1);
    expect(Array.from(groupOf)).toEqual([0, 0]);
    // The companion extends the same cut-out past the bright star's own disc.
    expect(owner[40 * W + 51]).toBe(0);
    expect(groups[0].x1).toBe(51);
  });

  it('should never hand an already owned pixel to a later, fainter star', () => {
    const stars = [star(40, 40, 0.9, 8), star(52, 40, 0.4, 8)];
    const { owner } = buildOwnership(stars, W, H);
    expect(owner[40 * W + 46]).toBe(0);
    expect(owner[40 * W + 50]).toBe(1);
  });

  it('should leave the stars it was given unchanged', () => {
    const stars = [star(40, 40, 0.9, 10), star(46, 40, 0.3, 5)];
    const before = JSON.stringify(stars);
    buildOwnership(stars, W, H);
    expect(JSON.stringify(stars)).toBe(before);
  });

  it('should clip discs at the image edge', () => {
    const { groups } = buildOwnership([star(2, 3, 0.9, 6)], W, H);
    expect(groups[0].x0).toBe(0);
    expect(groups[0].y0).toBe(0);
  });
});
