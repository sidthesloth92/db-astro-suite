/**
 * Single tab descriptor consumed by `SegmentedTabsComponent`.
 * `id` is the stable identifier emitted on selection; `label` is the
 * user-visible string rendered inside the pill.
 */
export interface SegmentedTabOption {
  /** Stable identifier for the option (emitted via `valueChange`). */
  readonly id: string;
  /** User-visible label rendered inside the pill. */
  readonly label: string;
  /** Optional hover tooltip describing what the tab does. */
  readonly tooltip?: string;
}
