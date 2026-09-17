import { haloBandPastel } from './halo-band-pastel.util';

describe('haloBandPastel', () => {
  it("should keep the design's rose, sky and peach for the narrowband trio", () => {
    expect(haloBandPastel('Hα', 0)).toBe('#FFB0CE');
    expect(haloBandPastel('OIII', 1)).toBe('#A8D5FF');
    expect(haloBandPastel('SII', 2)).toBe('#FFB8A8');
  });

  it('should colour a band by what it is, not where it sits in the list', () => {
    expect(haloBandPastel('R', 4)).toBe('#FFB0CE');
    expect(haloBandPastel('G', 0)).toBe('#A8E8D0');
    expect(haloBandPastel('B', 1)).toBe('#A8D5FF');
  });

  it('should match a known band whatever its letter case', () => {
    expect(haloBandPastel('oiii', 5)).toBe('#A8D5FF');
  });

  it('should cycle rose, sky, peach by position for a custom band', () => {
    expect(haloBandPastel('Custom', 0)).toBe('#FFB0CE');
    expect(haloBandPastel('Custom', 4)).toBe('#A8D5FF');
    expect(haloBandPastel('Custom', 5)).toBe('#FFB8A8');
  });
});
