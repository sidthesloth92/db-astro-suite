import { makePhoto } from '../../testing/synthetic-photo.util';
import { LiftStar } from '../models/star-lift.model';
import { findGiantStars } from './giant-star.util';
import { brightnessOf } from './star-detect.util';

const W = 200;
const H = 160;

describe('findGiantStars', () => {
  it('should report a burnt-out core with its centre, size and glow colour', () => {
    // amp far above 1 clips into a flat white core roughly 9 px in radius.
    const pixels = makePhoto(W, H, [0.05, 0.1, 0.2], [
      { x: 100, y: 80, amp: 6, sigma: 5, color: [0.6, 0.8, 1] },
    ]);
    const giants = findGiantStars(brightnessOf(pixels, W, H), pixels, W, H, []);

    expect(giants.length).toBe(1);
    expect(giants[0].x).toBeCloseTo(100, 0);
    expect(giants[0].y).toBeCloseTo(80, 0);
    expect(giants[0].rCore).toBeGreaterThan(5);
    expect(Math.max(...giants[0].color)).toBeCloseTo(1, 5);
    expect(giants[0].color[2]).toBeGreaterThan(giants[0].color[0]);
  });

  it('should ignore an ordinary star whose core is only a few pixels', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 100, y: 80, amp: 1.2, sigma: 1.3 }]);
    expect(findGiantStars(brightnessOf(pixels, W, H), pixels, W, H, []).length).toBe(0);
  });

  it('should not report a core that was already lifted as a star', () => {
    const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 100, y: 80, amp: 6, sigma: 5 }]);
    const lifted: LiftStar[] = [{ x: 100, y: 80, peak: 0.95, rHalf: 9, rHalo: 30 }];
    expect(findGiantStars(brightnessOf(pixels, W, H), pixels, W, H, lifted).length).toBe(0);
  });
});
