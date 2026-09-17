import { StarColor } from '../models/detected-star.model';
import { boostSaturation } from './star-color-saturation.util';

/** Saturation as the halo colour pipeline defines it: 1 - min / max. */
function saturationOf(color: StarColor): number {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max > 0 ? 1 - min / max : 0;
}

/** The three colour channels, so hue order can be ranked without a cast. */
const CHANNELS: readonly (keyof StarColor)[] = ['r', 'g', 'b'];

/** Ranks the channels brightest-first so hue order can be compared. */
function channelOrder(color: StarColor): string {
  return CHANNELS.slice()
    .sort((a, b) => color[b] - color[a])
    .join('');
}

describe('boostSaturation', () => {
  it('should return the input unchanged at factor 1 when it is below the ceiling', () => {
    const orange: StarColor = { r: 255, g: 140, b: 60 };

    expect(boostSaturation(orange, 1, 0.9)).toEqual(orange);
  });

  it('should return a fully saturated input unchanged at factor 1 when the ceiling allows it', () => {
    const pureBlue: StarColor = { r: 0, g: 0, b: 255 };

    expect(boostSaturation(pureBlue, 1, 1)).toEqual(pureBlue);
  });

  it('should double the saturation of a pastel blue while keeping blue on top', () => {
    const pastelBlue: StarColor = { r: 200, g: 215, b: 255 };

    const boosted = boostSaturation(pastelBlue, 2, 0.9);

    expect(boosted.b).toBe(255);
    expect(saturationOf(boosted)).toBeCloseTo(saturationOf(pastelBlue) * 2, 2);
    expect(channelOrder(boosted)).toBe('bgr');
  });

  it('should cap the boosted saturation at the ceiling', () => {
    const blue: StarColor = { r: 110, g: 150, b: 255 };

    const boosted = boostSaturation(blue, 2, 0.9);

    // 2 x 0.569 would be 1.14, so the cap wins: the min channel lands on
    // 255 * (1 - 0.9) = 25.5, i.e. 25 or 26 once rounded.
    expect(boosted.b).toBe(255);
    expect(Math.abs(boosted.r - 25.5)).toBeLessThanOrEqual(0.5);
    expect(saturationOf(boosted)).toBeCloseTo(0.9, 2);
  });

  it('should preserve the hue of a blue input by keeping its channel ratios below the peak', () => {
    const blue: StarColor = { r: 110, g: 150, b: 255 };

    const boosted = boostSaturation(blue, 2, 0.9);

    expect(channelOrder(boosted)).toBe('bgr');
    // Both lower channels move toward the peak by the same proportion, so the
    // green-to-red gap shrinks in step with the red-to-blue gap (hue held).
    const inputRatio = (255 - blue.g) / (255 - blue.r);
    const boostedRatio = (255 - boosted.g) / (255 - boosted.r);
    expect(boostedRatio).toBeCloseTo(inputRatio, 1);
  });

  it('should preserve the hue of an orange input', () => {
    const orange: StarColor = { r: 255, g: 180, b: 120 };

    const boosted = boostSaturation(orange, 2, 0.9);

    expect(boosted.r).toBe(255);
    expect(channelOrder(boosted)).toBe('rgb');
    expect(boosted.g).toBeLessThan(orange.g);
    expect(boosted.b).toBeLessThan(orange.b);
    const inputRatio = (255 - orange.g) / (255 - orange.b);
    const boostedRatio = (255 - boosted.g) / (255 - boosted.b);
    expect(boostedRatio).toBeCloseTo(inputRatio, 1);
  });

  it('should leave grey as grey', () => {
    expect(boostSaturation({ r: 255, g: 255, b: 255 }, 2, 0.9)).toEqual({ r: 255, g: 255, b: 255 });
    expect(boostSaturation({ r: 120, g: 120, b: 120 }, 2, 0.9)).toEqual({ r: 120, g: 120, b: 120 });
  });

  it('should leave black as black', () => {
    expect(boostSaturation({ r: 0, g: 0, b: 0 }, 2, 0.9)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('should return an input already at the ceiling unchanged', () => {
    // Saturation exactly 0.9: min = max * 0.1 with integer channels.
    const atCeiling: StarColor = { r: 25, g: 120, b: 250 };

    expect(boostSaturation(atCeiling, 2, 0.9)).toEqual(atCeiling);
  });

  it('should pull an input above the ceiling down to the ceiling', () => {
    const pureBlue: StarColor = { r: 0, g: 0, b: 255 };

    const boosted = boostSaturation(pureBlue, 2, 0.9);

    // The lower channels rise to 255 * (1 - 0.9) = 25.5, i.e. 25 or 26.
    expect(boosted.b).toBe(255);
    expect(Math.abs(boosted.r - 25.5)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(boosted.g - 25.5)).toBeLessThanOrEqual(0.5);
    expect(saturationOf(boosted)).toBeCloseTo(0.9, 2);
  });

  it('should always return integer channels within 0 to 255', () => {
    const inputs: StarColor[] = [
      { r: 255, g: 0, b: 0 },
      { r: 3, g: 7, b: 255 },
      { r: 254, g: 253, b: 255 },
      { r: 100, g: 50, b: 25 },
      { r: 255, g: 255, b: 254 },
    ];
    for (const input of inputs) {
      for (const factor of [0, 0.5, 1, 2, 10]) {
        const boosted = boostSaturation(input, factor, 0.9);
        for (const channel of [boosted.r, boosted.g, boosted.b]) {
          expect(Number.isInteger(channel))
            .withContext(JSON.stringify({ input, factor }))
            .toBeTrue();
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('should not mutate the input colour', () => {
    const input: StarColor = { r: 110, g: 150, b: 255 };
    const snapshot = { ...input };

    boostSaturation(input, 2, 0.9);

    expect(input).toEqual(snapshot);
  });
});
