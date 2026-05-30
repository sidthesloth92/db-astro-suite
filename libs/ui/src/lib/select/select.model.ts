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

/**
 * Group descriptor consumed by `SelectComponent` when rendering
 * `<optgroup>` headers. The `label` is the (non-selectable) group title
 * shown by the browser above its nested options.
 */
export interface SelectOptionGroup {
  /** Group title rendered as a non-selectable `<optgroup>` header. */
  readonly label: string;
  /** Options nested inside this group. */
  readonly options: readonly SelectOption[];
}

/**
 * Discriminated union accepted by `SelectComponent.options`. A bare
 * `SelectOption` renders as a top-level `<option>`; a `SelectOptionGroup`
 * renders as an `<optgroup>` wrapping nested `<option>` elements.
 * Grouped and ungrouped entries may be mixed in the same list.
 */
export type SelectItem = SelectOption | SelectOptionGroup;

/** Type guard — true when the item is a `SelectOptionGroup`. */
export function isSelectOptionGroup(item: SelectItem): item is SelectOptionGroup {
  return (item as SelectOptionGroup).options !== undefined;
}
