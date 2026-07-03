import type { CardThemeId } from '../../models/card-theme.model';
import {
  CARD_THEMES,
  buildCardThemeSelectItems,
  isCardThemeId,
  resolveCardTheme,
} from './card-themes.constants';

/** Every theme id that must be registered (the full design set). */
const ALL_THEME_IDS: readonly CardThemeId[] = [
  'pink-nebula',
  'obsidian',
  'observatory',
  'aurora-editorial',
  'spectrum',
  'halo',
  'blueprint',
  'mission-data',
  'duotone-poster',
  'flight-log',
  'constellation',
  'orrery',
  'comet',
  'ringed-planet',
  'headline',
  'star-card',
  'credits',
  'split-stats',
  'film-edge',
  'emission',
  'atlas',
  'credits-ivory',
  'daylight',
  'system-line',
  'star-trails',
  'moon-phases',
  'eclipse',
  'telrad',
  'event-horizon',
  'radiant',
];

describe('CARD_THEMES registry', () => {
  it('registers every theme id with a component and accents', () => {
    for (const id of ALL_THEME_IDS) {
      const def = CARD_THEMES[id];
      expect(def)
        .withContext(`theme "${id}" is missing from the registry`)
        .toBeTruthy();
      expect(def?.component).toBeTruthy();
      expect(def?.label).toBeTruthy();
      expect(def?.accents.accentColor).toMatch(/^#/);
    }
  });

  it('has no extra unexpected ids', () => {
    expect(Object.keys(CARD_THEMES).sort()).toEqual([...ALL_THEME_IDS].sort());
  });

  it('buildCardThemeSelectItems returns one entry per theme', () => {
    expect(buildCardThemeSelectItems().length).toBe(ALL_THEME_IDS.length);
  });

  it('resolveCardTheme falls back to pink-nebula for an unknown id', () => {
    expect(resolveCardTheme('not-a-theme' as CardThemeId)).toBe(CARD_THEMES['pink-nebula']!);
  });

  it('isCardThemeId narrows only registered ids', () => {
    expect(isCardThemeId('obsidian')).toBeTrue();
    expect(isCardThemeId('nope')).toBeFalse();
    expect(isCardThemeId(42)).toBeFalse();
  });
});
