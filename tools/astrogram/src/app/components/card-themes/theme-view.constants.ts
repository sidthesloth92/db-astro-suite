import type { ThemeIconName } from './shared/theme-icon.types';

/**
 * Long spectral names keyed by upper-cased filter name. Falls back to the
 * raw name when a filter isn't in the table (e.g. a custom filter).
 */
export const SPECTRAL_NAMES: Readonly<Record<string, string>> = {
  L: 'Luminance',
  HA: 'Hydrogen-α',
  OIII: 'Oxygen III',
  SII: 'Sulfur II',
  R: 'Red',
  G: 'Green',
  B: 'Blue',
};

/**
 * Display ids keyed by upper-cased filter name — lets `Ha` render as the
 * design's `Hα`. Filters not in the table keep their original name.
 */
export const FILTER_DISPLAY_IDS: Readonly<Record<string, string>> = {
  HA: 'Hα',
};

/** Themed line icons for equipment rows, indexed by position. */
export const EQUIPMENT_ICON_NAMES: readonly ThemeIconName[] = [
  'telescope',
  'camera',
  'mount',
  'target',
  'filter',
];

/** Themed line icons for software rows, indexed by position. */
export const SOFTWARE_ICON_NAMES: readonly ThemeIconName[] = ['chip', 'settings', 'sparkles'];

/** Resolves an equipment icon by row index, wrapping past the array end. */
export function equipmentIcon(index: number): ThemeIconName {
  return EQUIPMENT_ICON_NAMES[index % EQUIPMENT_ICON_NAMES.length];
}

/** Resolves a software icon by row index, wrapping past the array end. */
export function softwareIcon(index: number): ThemeIconName {
  return SOFTWARE_ICON_NAMES[index % SOFTWARE_ICON_NAMES.length];
}
