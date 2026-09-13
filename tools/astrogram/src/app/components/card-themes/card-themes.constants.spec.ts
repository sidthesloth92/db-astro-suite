import { isSelectOptionGroup, type SelectOption } from '@db-astro-suite/ui';
import type { CardThemeId } from '../../models/card-theme.model';
import {
  CARD_THEMES,
  CARD_THEME_GROUPS,
  buildCardThemeSelectItems,
  isCardThemeId,
  resolveCardTheme,
} from './card-themes.constants';

/** Every theme id that must be registered (the full design set). */
const ALL_THEME_IDS: readonly CardThemeId[] = [
  'original',
  'obsidian',
  'observatory',
  'aurora-editorial',
  'spectrum',
  'halo',
  'blueprint',
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

  it('buildCardThemeSelectItems offers every theme exactly once', () => {
    const values = buildCardThemeSelectItems()
      .flatMap((item) => (isSelectOptionGroup(item) ? item.options : [item as SelectOption]))
      .map((option) => option.value);

    expect(values.length).toBe(ALL_THEME_IDS.length);
    expect([...values].sort()).toEqual([...ALL_THEME_IDS].sort());
  });

  it('labels each picker option from the registry', () => {
    const groups = buildCardThemeSelectItems().filter(isSelectOptionGroup);

    for (const group of groups) {
      for (const option of group.options) {
        const definition = CARD_THEMES[option.value as CardThemeId];
        expect(definition).withContext(`no registry entry for ${option.value}`).toBeTruthy();
        expect(option.label).toBe(definition ? definition.label : '');
      }
    }
  });

  it('resolveCardTheme falls back to the original theme for an unknown id', () => {
    expect(resolveCardTheme('not-a-theme' as CardThemeId)).toBe(CARD_THEMES['original']!);
  });

  it('isCardThemeId narrows only registered ids', () => {
    expect(isCardThemeId('obsidian')).toBeTrue();
    expect(isCardThemeId('nope')).toBeFalse();
    expect(isCardThemeId(42)).toBeFalse();
  });
});

describe('CARD_THEME_GROUPS', () => {
  it('groups the picker as Social-first, Celestial then Infographics', () => {
    expect(CARD_THEME_GROUPS.map((group) => group.label)).toEqual([
      'Social-first',
      'Celestial',
      'Infographics',
    ]);
    expect(CARD_THEME_GROUPS.map((group) => group.ids.length)).toEqual([9, 7, 13]);
  });

  it('lists the themes in each picker group alphabetically', () => {
    const groups = buildCardThemeSelectItems().filter(isSelectOptionGroup);

    for (const group of groups) {
      const labels = group.options.map((option) => option.label);
      const sorted = [...labels].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' }),
      );
      expect(labels).withContext(`group "${group.label}"`).toEqual(sorted);
    }
  });

  it('no longer offers the retired Mission Data theme', () => {
    expect(isCardThemeId('mission-data')).toBeFalse();
  });

  it('places every registered theme in exactly one group', () => {
    // Without this, a theme added to the registry but not to a group would
    // silently vanish from the Layout panel's picker.
    const grouped = CARD_THEME_GROUPS.flatMap((group) => [...group.ids]);

    expect([...grouped].sort()).toEqual([...ALL_THEME_IDS].sort());
    expect(new Set(grouped).size)
      .withContext('a theme is listed in more than one group')
      .toBe(grouped.length);
  });
});
