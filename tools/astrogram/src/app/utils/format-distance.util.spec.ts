import { formatLightYears } from './format-distance.util';

describe('formatLightYears', () => {
  it('formats sub-thousand distances in light-years', () => {
    expect(formatLightYears(434.9)).toBe('435 ly');
    expect(formatLightYears(1)).toBe('1 ly');
  });

  it('shows thousands as full, comma-grouped light-years (3 sig figs)', () => {
    expect(formatLightYears(2500)).toBe('2,500 ly');
    expect(formatLightYears(22_831)).toBe('22,800 ly'); // M 13
    expect(formatLightYears(160_341)).toBe('160,000 ly');
  });

  it('scales millions to Mly', () => {
    expect(formatLightYears(11_500_000)).toBe('11.5 Mly');
    expect(formatLightYears(12_000_000)).toBe('12 Mly');
  });

  it('scales billions to Bly', () => {
    expect(formatLightYears(2_100_000_000)).toBe('2.1 Bly');
  });

  it('returns an empty string for missing or non-positive values', () => {
    expect(formatLightYears(null)).toBe('');
    expect(formatLightYears(undefined)).toBe('');
    expect(formatLightYears(0)).toBe('');
    expect(formatLightYears(-5)).toBe('');
    expect(formatLightYears(Number.NaN)).toBe('');
  });
});
