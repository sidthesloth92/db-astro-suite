import { MAGNITUDE_EXPONENT, STAR_COLORS } from '../constants/star-appearance.constant';
import { pickWeightedColorIndex, randomMagnitude } from './star-appearance.util';

describe('pickWeightedColorIndex', () => {
  it('should always return a valid palette index', () => {
    for (let i = 0; i < 500; i++) {
      const index = pickWeightedColorIndex();
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(STAR_COLORS.length);
    }
  });

  it('should pick the first colour when the roll lands at the bottom of the range', () => {
    expect(pickWeightedColorIndex(() => 0)).toBe(0);
  });

  it('should pick the last colour when the roll lands at the top of the range', () => {
    expect(pickWeightedColorIndex(() => 0.999999)).toBe(STAR_COLORS.length - 1);
  });

  it('should favour heavier-weighted colours over many rolls', () => {
    const counts = new Array(STAR_COLORS.length).fill(0);
    for (let i = 0; i < 5000; i++) {
      counts[pickWeightedColorIndex()]++;
    }
    const heaviest = STAR_COLORS.reduce(
      (best, color, index) => (color.weight > STAR_COLORS[best].weight ? index : best),
      0,
    );
    const lightest = STAR_COLORS.reduce(
      (best, color, index) => (color.weight < STAR_COLORS[best].weight ? index : best),
      0,
    );
    expect(counts[heaviest]).toBeGreaterThan(counts[lightest]);
  });
});

describe('randomMagnitude', () => {
  it('should stay within [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const magnitude = randomMagnitude();
      expect(magnitude).toBeGreaterThanOrEqual(0);
      expect(magnitude).toBeLessThanOrEqual(1);
    }
  });

  it('should shape the uniform roll with the magnitude exponent', () => {
    expect(randomMagnitude(() => 0.5)).toBeCloseTo(Math.pow(0.5, MAGNITUDE_EXPONENT), 10);
  });

  it('should skew dim so bright stars are rarer than dim ones', () => {
    let bright = 0;
    let dim = 0;
    for (let i = 0; i < 5000; i++) {
      if (randomMagnitude() >= 0.5) {
        bright++;
      } else {
        dim++;
      }
    }
    expect(dim).toBeGreaterThan(bright);
  });
});
