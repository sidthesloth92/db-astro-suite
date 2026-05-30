import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Compact 32×18 pill toggle. Mirrors the `ToggleP` primitive from the
 * direction-b-polished design. Renders as a real `<button role="switch">`
 * so it is keyboard accessible and announces its state.
 */
@Component({
  selector: 'dba-ui-switch',
  standalone: true,
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  /** Current checked state. */
  checked = input<boolean>(false);
  /** Disables interaction and dims the toggle. */
  disabled = input<boolean>(false);
  /** Accessible label, required for screen readers. */
  ariaLabel = input<string>('');

  /** Emits the new checked state when the user toggles the switch. */
  checkedChange = output<boolean>();

  /** Click handler — flips the checked state and emits. */
  onToggle(): void {
    if (this.disabled()) {
      return;
    }
    this.checkedChange.emit(!this.checked());
  }
}
