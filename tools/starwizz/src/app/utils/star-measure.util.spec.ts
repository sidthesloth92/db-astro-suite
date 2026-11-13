import { MEASURE_PROFILE_FLUX_FACTOR } from '../constants/star-lift.constant';
import { makePhoto } from '../../testing/synthetic-photo.util';
import { LiftStar } from '../models/star-lift.model';
import { measureStar } from './star-measure.util';

const W = 120;
const H = 120;
const at = (peak: number, rHalf: number, rHalo: number): LiftStar => ({ x: 60, y: 60, peak, rHalf, rHalo });

describe('measureStar', () => {
  it('should report the star’s peak brightness above its surroundings', () => {
    const pixels = makePhoto(W, H, [0.1, 0.1, 0.1], [{ x: 60, y: 60, amp: 0.5, sigma: 2 }]);
    const m = measureStar(at(0.5, 3, 10), pixels, W, H);
    expect(m).not.toBeNull();
    expect(m!.amp).toBeCloseTo(0.5, 1);
  });

  it('should pick a width that carries the star’s measured light', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 60, y: 60, amp: 0.6, sigma: 2 }]);
    const m = measureStar(at(0.6, 3, 12), pixels, W, H)!;
    // Total light of a Gaussian of peak A and sigma s is 2*pi*A*s^2.
    const trueLight = 2 * Math.PI * 0.6 * 4;
    const redrawnLight = MEASURE_PROFILE_FLUX_FACTOR * m.amp * m.hwhm * m.hwhm;
    expect(redrawnLight / trueLight).toBeGreaterThan(0.8);
    expect(redrawnLight / trueLight).toBeLessThan(1.2);
  });

  it('should measure a white star on coloured nebula as near white, not nebula coloured', () => {
    const pixels = makePhoto(W, H, [0.1, 0.35, 0.12], [{ x: 60, y: 60, amp: 0.5, sigma: 2 }]);
    const m = measureStar(at(0.5, 3, 10), pixels, W, H)!;
    expect(Math.min(...m.color)).toBeGreaterThan(0.85);
  });

  it('should keep the colour of a coloured star, brightest channel scaled to one', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 60, y: 60, amp: 0.6, sigma: 2, color: [1, 0.6, 0.3] }]);
    const m = measureStar(at(0.6, 3, 10), pixels, W, H)!;
    expect(m.color[0]).toBeCloseTo(1, 5);
    expect(m.color[1]).toBeCloseTo(0.6, 1);
    expect(m.color[2]).toBeCloseTo(0.3, 1);
  });

  it('should not count a bright neighbour’s glow as part of a faint star', () => {
    const alone = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 60, y: 60, amp: 0.2, sigma: 1.2 }]);
    const withNeighbour = makePhoto(W, H, [0.05, 0.05, 0.05], [
      { x: 60, y: 60, amp: 0.2, sigma: 1.2 },
      { x: 60, y: 60, amp: 0.3, sigma: 25 }, // broad glow under the star
    ]);
    const a = measureStar(at(0.2, 1, 4), alone, W, H)!;
    const b = measureStar(at(0.2, 1, 4), withNeighbour, W, H)!;
    expect(b.amp).toBeCloseTo(a.amp, 1);
    expect(b.hwhm).toBeCloseTo(a.hwhm, 0);
  });

  it('should return nothing where no light stands above the surroundings', () => {
    expect(measureStar(at(0.2, 2, 6), makePhoto(W, H, [0.2, 0.2, 0.2]), W, H)).toBeNull();
  });
});
