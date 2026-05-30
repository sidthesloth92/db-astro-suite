import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Compact colour-picker row. Mirrors the `ColorP` primitive from the
 * direction-b-polished design — a small square swatch + uppercase hex
 * text in a bordered pill. Clicking the swatch opens the OS-native
 * colour picker via a hidden `<input type="color">`.
 */
@Component({
  selector: 'dba-ui-color-swatch-input',
  standalone: true,
  templateUrl: './color-swatch-input.component.html',
  styleUrls: ['./color-swatch-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSwatchInputComponent {
  /** Current hex colour value (e.g. `"#FF2D95"`). */
  value = input<string>('#000000');
  /** Accessible label forwarded to the native `<input type="color">`. */
  ariaLabel = input<string | undefined>(undefined);

  /** Emits the new hex colour when the user picks a different value. */
  valueChange = output<string>();

  /** Uppercase display string for the readout label. */
  readonly displayValue = computed(() => this.value().toUpperCase());

  /** Internal change handler — forwards the picked colour to `valueChange`. */
  onPick(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
