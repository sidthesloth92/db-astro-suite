import { joinMetaItems } from './meta-join.util';

describe('joinMetaItems', () => {
  it('should only leave break opportunities before a separator', () => {
    expect(joinMetaItems(['Sep 13, 2026', 'Irving, Texas'])).toBe('Sep 13, 2026 · Irving, Texas');
  });

  it('should glue the last item to the one before it when asked', () => {
    expect(joinMetaItems(['Sep 13', 'Irving', 'Bortle 9'], true)).toBe('Sep 13 · Irving · Bortle 9');
  });

  it('should drop empty items without leaving a stray separator', () => {
    expect(joinMetaItems(['Sep 13', '  ', 'Bortle 9'])).toBe('Sep 13 · Bortle 9');
  });

  it('should return a single item as is', () => {
    expect(joinMetaItems(['Bortle 9'], true)).toBe('Bortle 9');
  });
});
