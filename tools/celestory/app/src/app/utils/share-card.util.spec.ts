import { describe, expect, it } from 'vitest';
import { SHARE_THEME_LIST, THEME_MOTIF } from './share-card.util';
import type { ShareThemeId } from '../models/share.types';

describe('share-card themes', () => {
  it('ships the 16 named themes', () => {
    expect(SHARE_THEME_LIST).toHaveLength(16);
  });

  it('gives every listed theme a motif mapping', () => {
    for (const theme of SHARE_THEME_LIST) {
      expect(THEME_MOTIF[theme.id]).toBeTruthy();
    }
  });

  it('gives every listed theme a CSS swatch', () => {
    for (const theme of SHARE_THEME_LIST) {
      expect(theme.swatch).toMatch(/gradient/);
    }
  });

  it('has a motif entry for every theme id with no extras', () => {
    const ids = SHARE_THEME_LIST.map((t) => t.id).sort();
    const motifIds = (Object.keys(THEME_MOTIF) as ShareThemeId[]).sort();
    expect(motifIds).toEqual(ids);
  });
});
