import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { copyToClipboard } from '../../utils/clipboard.util';
import { RECOVERY_COPIED_RESET_MS } from '../../models/recovery-code.constants';

/**
 * Shows a profile's one-time recovery code with a Copy button and the warning
 * that it can't be shown again. Presentational: the parent supplies the code
 * (from a publish or a password reset) and decides when to show it.
 */
@Component({
  selector: 'dba-recovery-code-panel',
  standalone: true,
  templateUrl: './recovery-code-panel.component.html',
  styleUrl: './recovery-code-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCodePanelComponent {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  /** Clears a pending "Copied" reset when the panel is destroyed. */
  private readonly clearTimerOnDestroy = inject(DestroyRef).onDestroy(() => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  });

  /** The recovery code in display form, e.g. `K7Q2M-9XH4T-R3WPA-6ZD8N`. */
  readonly code = input.required<string>();

  /** True briefly after a successful copy. */
  protected readonly copied = signal(false);

  /** Copy the code to the clipboard and flash "Copied". */
  async copy(): Promise<void> {
    if (!(await copyToClipboard(this.code()))) {
      return;
    }
    this.copied.set(true);
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => this.copied.set(false), RECOVERY_COPIED_RESET_MS);
  }
}
