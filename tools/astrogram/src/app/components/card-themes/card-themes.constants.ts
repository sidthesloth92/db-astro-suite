import type { SelectItem } from '@db-astro-suite/ui';
import type { CardThemeId } from '../../models/card-theme.model';
import type { CardThemeDefinition } from './card-theme-definition.model';
import { PinkNebulaThemeComponent } from './pink-nebula/pink-nebula-theme.component';
import { ObsidianThemeComponent } from './obsidian/obsidian-theme.component';

/** Fallback theme id used whenever a requested id has no registry entry. */
export const DEFAULT_CARD_THEME_ID: CardThemeId = 'pink-nebula';

/**
 * Registry of every selectable card theme, keyed by `CardThemeId`. Adding a
 * theme is one component + one entry here — nothing else changes.
 *
 * Typed `Partial` so the app compiles while themes are ported wave-by-wave;
 * `card-themes.constants.spec.ts` asserts every `CardThemeId` is present.
 */
export const CARD_THEMES: Partial<Record<CardThemeId, CardThemeDefinition>> = {
  'pink-nebula': {
    label: 'Pink Nebula',
    subtitle: 'Default · deep magenta on nebula',
    component: PinkNebulaThemeComponent,
    accents: {
      accentColor: '#D63384',
      accentColorRgb: '214, 51, 132',
      secondaryAccentColor: '#5DD8FF',
    },
  },
  obsidian: {
    label: 'Obsidian Glass',
    subtitle: 'Glassmorphism · cyan/violet aurora',
    component: ObsidianThemeComponent,
    accents: {
      accentColor: '#5DD8FF',
      accentColorRgb: '93, 216, 255',
      secondaryAccentColor: '#B97DFF',
    },
  },
};

/** Resolves a theme definition by id, falling back to the default theme. */
export function resolveCardTheme(id: CardThemeId): CardThemeDefinition {
  // Non-null: the default theme is always registered.
  return CARD_THEMES[id] ?? CARD_THEMES[DEFAULT_CARD_THEME_ID]!;
}

/** Narrows an arbitrary value to a registered `CardThemeId`. */
export function isCardThemeId(value: unknown): value is CardThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CARD_THEMES, value);
}

/** Builds the `SelectItem[]` list for the Layout panel's theme picker. */
export function buildCardThemeSelectItems(): readonly SelectItem[] {
  return Object.entries(CARD_THEMES).map(([value, def]) => ({
    value,
    label: def.label,
  }));
}
