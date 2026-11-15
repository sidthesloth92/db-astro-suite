import { makePhoto } from '../../testing/synthetic-photo.util';
import { cloudDepthFromStarless } from './cloud-depth.util';

const W = 160;
const H = 120;

describe('cloudDepthFromStarless', () => {
  it('should bring a bright cloud nearer than the dark sky around it', () => {
    const starless = makePhoto(W, H, [0.03, 0.03, 0.04], [{ x: 80, y: 60, amp: 0.6, sigma: 22, color: [0.3, 0.8, 1] }]);
    const depth = cloudDepthFromStarless(starless, W, H);
    expect(depth[60 * W + 80]).toBeGreaterThan(200);
    expect(depth[5 * W + 5]).toBeLessThan(30);
  });

  it('should fall away smoothly from the cloud’s centre to its edge', () => {
    const starless = makePhoto(W, H, [0.03, 0.03, 0.04], [{ x: 80, y: 60, amp: 0.6, sigma: 22 }]);
    const depth = cloudDepthFromStarless(starless, W, H);
    let previous = depth[60 * W + 80];
    for (let x = 84; x < 150; x += 4) {
      expect(depth[60 * W + x]).toBeLessThanOrEqual(previous);
      previous = depth[60 * W + x];
    }
  });

  it('should give one value per pixel', () => {
    const depth = cloudDepthFromStarless(makePhoto(W, H, [0.1, 0.1, 0.1]), W, H);
    expect(depth.length).toBe(W * H);
  });
});
