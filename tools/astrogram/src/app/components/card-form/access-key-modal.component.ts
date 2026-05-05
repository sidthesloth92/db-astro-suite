import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { InputComponent } from '@db-astro-suite/ui';
import { AnalyticsService } from '@db-astro-suite/ui';
import { inject } from '@angular/core';

/**
 * Modal dialog that prompts the user to enter an Astrosolve access key.
 * Displays an error state when the previously stored key was rejected by the API.
 */
@Component({
  selector: 'dba-ag-access-key-modal',
  standalone: true,
  imports: [InputComponent],
  templateUrl: './access-key-modal.component.html',
  styleUrls: ['./access-key-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeyModalComponent {
  private analyticsService = inject(AnalyticsService);
  
  /** Whether to show an invalid-key error message to the user. */
  showError = input(false);

  /** Emits the trimmed access key string when the user submits the form. */
  submitted = output<string>();

  /** Emits when the user dismisses the modal without submitting. */
  cancelled = output<void>();

  readonly keyValue = signal('');

  /** True when the key input is empty, disabling the submit button. */
  readonly isSubmitDisabled = computed(() => this.keyValue().trim().length === 0);

  /** Syncs the bound input component's value to the local signal. */
  onKeyChange(value: string | number): void {
    this.keyValue.set(String(value));
  }

  /** Emits the trimmed key via `submitted` if the input is non-empty. */
  onSubmit(): void {
    const key = this.keyValue().trim();
    if (key) {
      this.analyticsService.trackAccessKeySubmitted(true);
      this.submitted.emit(key);
    } else {
      this.analyticsService.trackAccessKeySubmitted(false);
    }
  }

  /** Emits `cancelled` to let the parent destroy this modal. */
  onCancel(): void {
    this.cancelled.emit();
  }
}
