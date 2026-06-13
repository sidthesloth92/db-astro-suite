/**
 * One entry in the {@link SplitButtonComponent} dropdown menu.
 */
export interface SplitButtonMenuItem {
  /** Stable value emitted via `menuSelect` when the item is chosen. */
  value: string;
  /** Primary label of the menu row. */
  label: string;
  /** Optional secondary line rendered under the label. */
  description?: string;
  /** Optional right-aligned detail text (e.g. "~47 MB"). */
  detail?: string;
}
