import { describe, expect, it } from 'vitest';
import { CAROUSEL_SLIDE_COUNT, SHARE_FORMAT_LIST, SHARE_THEME_LIST } from './share-card.util';

describe('share-card themes', () => {
  it('ships the 16 named themes', () => {
    expect(SHARE_THEME_LIST).toHaveLength(16);
  });

  it('gives every listed theme a CSS gradient swatch', () => {
    for (const theme of SHARE_THEME_LIST) {
      expect(theme.swatch).toMatch(/gradient/);
    }
  });

  it('uses unique theme ids', () => {
    const ids = SHARE_THEME_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('share-card formats + carousel', () => {
  it('ships the three social formats', () => {
    expect(SHARE_FORMAT_LIST.map((f) => f.id).sort()).toEqual(['landscape', 'square', 'story']);
  });

  it('has a five-slide carousel', () => {
    expect(CAROUSEL_SLIDE_COUNT).toBe(5);
  });
});
