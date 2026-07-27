import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { refineStar } from './star-refine.util';
import { renderSyntheticField } from './star-field-fixture.util';

const FLAT_BACKGROUND: SyntheticBackground = { base: 10, gradientX: 0, gradientY: 0 };

describe('refineStar', () => {
  it('should refine a synthetic star centroid to within 0.2 px with a positive peak', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [{ x: 31.6, y: 32.3, amplitude: 200, sigma: 2 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 31, 32, 8);

    expect(Math.abs(refined.x - 31.6)).toBeLessThan(0.2);
    expect(Math.abs(refined.y - 32.3)).toBeLessThan(0.2);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should recover the injected tint hue after max-channel normalization', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 200, sigma: 2, color: { r: 255, g: 128, b: 0 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 8);

    // Red is the dominant injected channel, so it normalizes to exactly 255.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeLessThan(refined.color.r);
    expect(refined.color.b).toBeLessThan(refined.color.g);
    expect(refined.color.b).toBeLessThan(50);
  });

  it('should return a sensible color for a star with a saturated core', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 900, sigma: 2.5, color: { r: 255, g: 180, b: 120 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 10);

    // The saturated core is excluded; the unsaturated ring keeps the tint.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeGreaterThan(refined.color.b);
    expect(refined.color.g).toBeLessThan(255);
    for (const channel of [refined.color.r, refined.color.g, refined.color.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
    expect(Math.abs(refined.x - 32)).toBeLessThan(0.5);
    expect(Math.abs(refined.y - 32)).toBeLessThan(0.5);
  });

  it('should clamp the window at the image edges without crashing', () => {
    const width = 40;
    const height = 40;
    const stars: SyntheticStar[] = [{ x: 2.2, y: 1.8, amplitude: 150, sigma: 1.5 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 2, 2, 8);

    expect(Number.isFinite(refined.x)).toBeTrue();
    expect(Number.isFinite(refined.y)).toBeTrue();
    expect(Math.abs(refined.x - 2.2)).toBeLessThan(1);
    expect(Math.abs(refined.y - 1.8)).toBeLessThan(1);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should fall back to the approximate position when the window is empty', () => {
    const width = 16;
    const height = 16;
    const rgba = renderSyntheticField(width, height, [], FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, -50, -50, 4);

    expect(refined.x).toBe(-50);
    expect(refined.y).toBe(-50);
    expect(refined.peak).toBe(0);
    expect(refined.color).toEqual({ r: 255, g: 255, b: 255 });
  });
});
