import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { InputComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-ag-access-key-modal',
  standalone: true,
  imports: [InputComponent],
  templateUrl: './access-key-modal.component.html',
  styleUrls: ['./access-key-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeyModalComponent {
  showError = input(false);

  submitted = output<string>();
  cancelled = output<void>();

  readonly keyValue = signal('');
  readonly isSubmitDisabled = computed(() => this.keyValue().trim().length === 0);

  onKeyChange(value: string | number): void {
    this.keyValue.set(String(value));
  }

  onSubmit(): void {
    const key = this.keyValue().trim();
    if (key) {
      this.submitted.emit(key);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
