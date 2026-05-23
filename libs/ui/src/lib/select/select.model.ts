/**
 * Option descriptor consumed by `SelectComponent`. `value` is what gets
 * emitted via `valueChange`; `label` is the user-visible string.
 */
export interface SelectOption {
  /** User-visible label rendered inside the `<option>` element. */
  readonly label: string;
  /** Value emitted when the user picks the option. */
  readonly value: string | number | boolean;
}
