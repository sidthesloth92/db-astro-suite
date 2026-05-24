import type { SegmentedTabOption } from '@db-astro-suite/ui';

/** Stable identifiers for the Astrogram mode tabs. Maps 1:1 to `CardDataService.activeMode`. */
export type ModeTabId = 'infographic' | 'stellar';

/** Mode-tab options rendered in the preview toolbar's segmented tabs. */
export const MODE_TAB_OPTIONS: readonly SegmentedTabOption[] = [
  { id: 'infographic', label: 'Info' },
  { id: 'stellar', label: 'Stellar' },
];

/** Maps a tab id back to the `CardDataService.activeMode` value. */
export function tabIdToActiveMode(id: string): 'infographic' | 'stellar-map' {
  return id === 'stellar' ? 'stellar-map' : 'infographic';
}

/** Maps an `activeMode` value to the tab id used by `MODE_TAB_OPTIONS`. */
export function activeModeToTabId(mode: 'infographic' | 'stellar-map'): ModeTabId {
  return mode === 'stellar-map' ? 'stellar' : 'infographic';
}
