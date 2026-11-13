import { keepPlaceNamesTogether, keepWordsTogether } from './keep-together.util';

describe('keepWordsTogether', () => {
  it('should join the words of a short phrase with no-break spaces', () => {
    expect(keepWordsTogether('Sep 13, 2026')).toBe('Sep 13, 2026');
  });

  it('should leave a phrase too long for one line breakable', () => {
    const long = 'An extremely long observatory name that cannot fit';

    expect(keepWordsTogether(long)).toBe(long);
  });

  it('should trim surrounding whitespace', () => {
    expect(keepWordsTogether('  Irving ')).toBe('Irving');
  });
});

describe('keepPlaceNamesTogether', () => {
  it('should only leave break opportunities after the commas', () => {
    expect(keepPlaceNamesTogether('Mount Laguna Observatory, San Diego County, California')).toBe(
      'Mount Laguna Observatory, San Diego County, California',
    );
  });

  it('should keep a plain location unchanged', () => {
    expect(keepPlaceNamesTogether('Irving, Texas')).toBe('Irving, Texas');
  });

  it('should drop empty parts left by stray commas', () => {
    expect(keepPlaceNamesTogether('Irving,, Texas,')).toBe('Irving, Texas');
  });
});
