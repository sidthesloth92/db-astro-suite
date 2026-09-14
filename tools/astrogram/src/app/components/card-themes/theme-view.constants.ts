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

/**
 * Sky descriptors for Bortle 1–9, indexed by `value - 1`. Themes render these
 * instead of asserting a sky class in fixed copy.
 */
export const BORTLE_DESCRIPTORS: readonly string[] = [
  'excellent dark-sky',
  'truly dark',
  'rural',
  'rural / suburban',
  'suburban',
  'bright suburban',
  'suburban / urban',
  'city',
  'inner city',
];

/** Upper-cased names of the narrowband filters, in canonical S-H-O order. */
export const NARROWBAND_FILTERS: readonly string[] = ['SII', 'HA', 'OIII'];

/** Upper-cased names of the broadband filters, in canonical L-R-G-B order. */
export const BROADBAND_FILTERS: readonly string[] = ['L', 'R', 'G', 'B'];

/**
 * Single-letter palette codes keyed by upper-cased filter name. Iterated in
 * declaration order so `{L,R,G,B}` reads `LRGB` and `{SII,HA,OIII}` reads
 * `SHO` regardless of the order the user enabled them in.
 */
export const PALETTE_LETTERS: Readonly<Record<string, string>> = {
  L: 'L',
  R: 'R',
  G: 'G',
  B: 'B',
  SII: 'S',
  HA: 'H',
  OIII: 'O',
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
