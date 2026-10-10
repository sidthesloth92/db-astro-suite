import type { HeatMilestoneKind } from './portfolio-view.types';
import { BRAND_CYAN, BRAND_PINK } from './brand.constants';

/**
 * Tuning + accent colors for nightly-activity milestone callouts.
 *
 * The hex literals for `hours`/`night` accents are an intentional, documented
 * exception to the "no hardcoded color" rule — they are domain accent colors
 * applied via an inline `--ms` custom property (the same pattern as FILTER_META
 * emission colors and brand.constants), not general UI styling, so they live in
 * a constants module rather than as theme tokens. `frames` and `target` reuse the
 * brand pink / cyan.
 */

/** Cumulative-hours thresholds (hours of total integration). */
export const MILESTONE_HOURS: readonly number[] = [25, 50, 100, 250, 500, 1000, 2000];

/** Cumulative light-frame thresholds, with their compact chip labels. */
export const MILESTONE_FRAMES: readonly { readonly at: number; readonly label: string }[] = [
  { at: 1000, label: '1K' },
  { at: 2500, label: '2.5K' },
  { at: 5000, label: '5K' },
  { at: 10000, label: '10K' },
  { at: 25000, label: '25K' },
  { at: 50000, label: '50K' },
];

/** Distinct-target thresholds (the Nth unique target first imaged). */
export const MILESTONE_TARGETS: readonly number[] = [10, 25, 50, 100];

/** Night-count thresholds (the Nth night imaged). */
export const MILESTONE_NIGHTS: readonly number[] = [50, 100, 200, 365];

/** Accent color per milestone kind, applied via the inline `--ms` property. */
export const MILESTONE_COLOR: Record<HeatMilestoneKind, string> = {
  hours: '#9b8cff',
  frames: BRAND_PINK,
  target: BRAND_CYAN,
  night: '#ffd16a',
  best: '#ffd16a',
};
