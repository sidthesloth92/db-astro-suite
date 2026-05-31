import { formatLightYears } from './format-distance.util';

describe('formatLightYears', () => {
  it('formats sub-kilo distances in light-years', () => {
    expect(formatLightYears(434.9)).toBe('435 ly');
    expect(formatLightYears(1)).toBe('1 ly');
  });

  it('scales thousands to kly', () => {
    expect(formatLightYears(2500)).toBe('2.5 kly');
    expect(formatLightYears(24135)).toBe('24.1 kly');
  });

  it('scales millions to Mly', () => {
    expect(formatLightYears(11_500_000)).toBe('11.5 Mly');
  });

  it('scales billions to Gly', () => {
    expect(formatLightYears(2_100_000_000)).toBe('2.1 Gly');
  });

  it('returns an empty string for missing or non-positive values', () => {
    expect(formatLightYears(null)).toBe('');
    expect(formatLightYears(undefined)).toBe('');
    expect(formatLightYears(0)).toBe('');
    expect(formatLightYears(-5)).toBe('');
    expect(formatLightYears(Number.NaN)).toBe('');
  });
});
