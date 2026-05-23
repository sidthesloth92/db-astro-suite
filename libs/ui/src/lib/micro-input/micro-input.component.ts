import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Native HTML input types supported by `MicroInputComponent`. */
export type MicroInputType = 'text' | 'number';

/**
 * Slim inspector-panel input. Mirrors the `InputP` primitive from the
 * direction-b-polished design — a single-line input with optional
 * prefix/suffix decorators (e.g. "@", "ly") and a mono-font variant
 * for numeric / coordinate values.
 */
@Component({
  selector: 'dba-ui-micro-input',
  standalone: true,
  templateUrl: './micro-input.component.html',
  styleUrls: ['./micro-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicroInputComponent {
  /** Current input value, as a string. */
  value = input<string>('');
  /** Renders the input text in the mono font (for numbers / coordinates). */
  mono = input<boolean>(false);
  /** Optional prefix decorator rendered before the input (e.g. "@", "#"). */
  prefix = input<string | undefined>(undefined);
  /** Optional suffix decorator rendered after the input (e.g. "ly", "px"). */
  suffix = input<string | undefined>(undefined);
  /** Placeholder shown when the input is empty. */
  placeholder = input<string>('');
  /** Native input type. Defaults to `'text'`. */
  type = input<MicroInputType>('text');

  /** Emits the new string value on every keystroke. */
  valueChange = output<string>();

  /** Internal change handler — forwards the typed value to `valueChange`. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
