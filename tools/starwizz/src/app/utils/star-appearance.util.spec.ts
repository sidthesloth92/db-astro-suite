import {
  COLORFUL_RATIO_NEUTRAL,
  MAGNITUDE_EXPONENT,
  STAR_COLORS,
  WHITE_STAR_INDEX,
} from '../constants/star-appearance.constant';
import {
  colorMixForIntensity,
  mixRgb,
  pickWeightedColorIndex,
  randomMagnitude,
  spikeAlphaForAmount,
  spikeSizeFactorForAmount,
  spikeThresholdForAmount,
  tintForIntensity,
  twinkleAmplitudeForStrength,
} from './star-appearance.util';

const DEFAULT_RATIO = 4;

describe('mixRgb', () => {
  it('should return the endpoints at t = 0 and t = 1', () => {
    const from = { r: 0, g: 100, b: 200 };
    const to = { r: 255, g: 0, b: 50 };

    expect(mixRgb(from, to, 0)).toEqual(from);
    expect(mixRgb(from, to, 1)).toEqual(to);
  });

  it('should clamp the mix factor into [0, 1]', () => {
    const from = { r: 0, g: 0, b: 0 };
    const to = { r: 100, g: 100, b: 100 };

    expect(mixRgb(from, to, -1)).toEqual(from);
    expect(mixRgb(from, to, 2)).toEqual(to);
  });
});

describe('colorMixForIntensity', () => {
  it('should reproduce the natural reference mix at the default level', () => {
    expect(colorMixForIntensity(3)).toBeCloseTo(0.85, 10);
  });

  it('should extrapolate past the anchor at the top level', () => {
    expect(colorMixForIntensity(10)).toBeCloseTo(1.6, 10);
  });
});

describe('tintForIntensity', () => {
  it('should match the plain white-to-anchor mix at the reference level', () => {
    const anchor = { r: 130, g: 165, b: 255 };
    expect(tintForIntensity(anchor, 3)).toEqual(
      mixRgb({ r: 255, g: 255, b: 255 }, anchor, 0.85),
    );
  });

  it('should be deeper than the reference tint at the top level', () => {
    const anchor = { r: 130, g: 165, b: 255 };
    const reference = tintForIntensity(anchor, 3);
    const deep = tintForIntensity(anchor, 10);
    expect(deep.r).toBeLessThan(reference.r);
    expect(deep.g).toBeLessThan(reference.g);
  });

  it('should clamp every channel into [0, 255] at the top level', () => {
    for (const color of STAR_COLORS) {
      const tint = tintForIntensity(color, 10);
      for (const value of [tint.r, tint.g, tint.b]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('twinkleAmplitudeForStrength', () => {
  it('should disable the twinkle at strength 0', () => {
    expect(twinkleAmplitudeForStrength(0)).toBe(0);
  });

  it('should reproduce the gentle H.264-safe amplitude at strength 2', () => {
    expect(twinkleAmplitudeForStrength(2)).toBeCloseTo(0.18, 10);
  });

  it('should pulse hard at full strength', () => {
    expect(twinkleAmplitudeForStrength(10)).toBeCloseTo(0.9, 10);
  });
});

describe('spikeThresholdForAmount', () => {
  it('should put the threshold out of reach at amount 0', () => {
    expect(spikeThresholdForAmount(0)).toBe(1);
  });

  it('should keep spikes on only the brightest stars at the default amount', () => {
    expect(spikeThresholdForAmount(3)).toBeCloseTo(0.715, 10);
  });

  it('should lower the threshold as the amount grows', () => {
    expect(spikeThresholdForAmount(10)).toBeLessThan(spikeThresholdForAmount(3));
  });
});

describe('spikeSizeFactorForAmount', () => {
  it('should stretch the arms as the amount grows', () => {
    expect(spikeSizeFactorForAmount(10)).toBeGreaterThan(spikeSizeFactorForAmount(3));
  });
});

describe('spikeAlphaForAmount', () => {
  it('should reach full arm brightness at the top of the slider', () => {
    expect(spikeAlphaForAmount(10)).toBe(1);
  });

  it('should keep the arms translucent at the default amount', () => {
    expect(spikeAlphaForAmount(3)).toBeLessThan(1);
  });
});

describe('pickWeightedColorIndex', () => {
  it('should always return a valid palette index', () => {
    for (let i = 0; i < 500; i++) {
      const index = pickWeightedColorIndex(DEFAULT_RATIO);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(STAR_COLORS.length);
    }
  });

  it('should pick the first colour when the roll lands at the bottom of the range', () => {
    expect(pickWeightedColorIndex(DEFAULT_RATIO, () => 0)).toBe(0);
  });

  it('should pick the last colour when the roll lands at the top of the range', () => {
    expect(pickWeightedColorIndex(DEFAULT_RATIO, () => 0.999999)).toBe(STAR_COLORS.length - 1);
  });

  it('should always pick white when the colorful ratio is 0', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickWeightedColorIndex(0)).toBe(WHITE_STAR_INDEX);
    }
  });

  it('should produce more coloured stars at the top level than at the default', () => {
    let coloredAtDefault = 0;
    let coloredAtMax = 0;
    for (let i = 0; i < 5000; i++) {
      if (pickWeightedColorIndex(DEFAULT_RATIO) !== WHITE_STAR_INDEX) coloredAtDefault++;
      if (pickWeightedColorIndex(10) !== WHITE_STAR_INDEX) coloredAtMax++;
    }
    expect(coloredAtMax).toBeGreaterThan(coloredAtDefault);
  });

  it('should favour heavier-weighted colours over many rolls', () => {
    const counts = new Array(STAR_COLORS.length).fill(0);
    for (let i = 0; i < 5000; i++) {
      // Neutral level — base weights apply unscaled, so the base ordering holds.
      counts[pickWeightedColorIndex(COLORFUL_RATIO_NEUTRAL)]++;
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
