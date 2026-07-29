import { SegmentedTabOption } from '@db-astro-suite/ui';
import { SpikeStyle } from '../models/spike-style.model';

/**
 * Segmented-tab options for choosing what a single star draws.
 */
export const SPIKE_STYLE_TABS: readonly SegmentedTabOption[] = [
  { id: 'spikes', label: 'Spikes', tooltip: 'Diffraction arms plus a core glow' },
  { id: 'glow', label: 'Glow', tooltip: 'A soft bloom with no arms' },
];

/**
 * Maps a segmented-tab id back to the style it selects.
 */
export const SPIKE_STYLE_BY_TAB_ID: Record<string, SpikeStyle> = {
  spikes: 'spikes',
  glow: 'glow',
};
