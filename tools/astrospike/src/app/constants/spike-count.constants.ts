import { SegmentedTabOption } from '@db-astro-suite/ui';

/**
 * Segmented-tab options for choosing the number of spike arms per star.
 */
export const SPIKE_COUNT_TABS: readonly SegmentedTabOption[] = [
  { id: '4', label: '4 spikes' },
  { id: '6', label: '6 spikes' },
];

/**
 * Maps a segmented-tab id to its spike arm count.
 */
export const SPIKE_COUNT_BY_TAB_ID: Record<string, 4 | 6> = {
  '4': 4,
  '6': 6,
};

/**
 * Maps a spike arm count back to its segmented-tab id.
 */
export const TAB_ID_BY_SPIKE_COUNT: Record<number, string> = {
  4: '4',
  6: '6',
};
