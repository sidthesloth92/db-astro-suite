import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { isSelectOptionGroup, type SelectItem } from './select.model';

/**
 * Native `<select>` wrapper styled to match the Direction B Polished tokens.
 * Exposes a typed option list, optional label, and emits the chosen value
 * via `valueChange`. Accepts both flat options and `<optgroup>` groupings
 * via the discriminated `SelectItem` union. The `noBox` flag drops the
 * bordered container chrome for inline / dense layouts.
 */
@Component({
  selector: 'dba-ui-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {
  /** Optional label rendered above the select. */
  label = input<string>('');
  /** Currently selected value. */
  value = input<string | number | boolean>('');
  /**
   * Options or option-groups to render. Bare `SelectOption` entries
   * become top-level `<option>`s; `SelectOptionGroup` entries become
   * `<optgroup>` headers wrapping nested options. Both can be mixed.
   */
  options = input<readonly SelectItem[]>([]);
  /** When true, drops the bordered container chrome. */
  noBox = input<boolean>(false);

  /** Emits the new selected value as a string (native `<select>` behaviour). */
  valueChange = output<string | number | boolean>();

  /** Template-facing alias for the model type guard. */
  protected readonly isGroup = isSelectOptionGroup;

  /** Internal change handler — forwards the value off the native `<select>`. */
  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value);
  }
}
