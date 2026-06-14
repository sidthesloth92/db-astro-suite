import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Shown after a ledger is uploaded: lets the user choose between visualising +
 * sharing locally (nothing leaves the browser) or creating an online Celestory
 * profile (a permanent URL + delete token). Both paths open the portfolio; the
 * "create" path also opens the publish flow. Purely presentational.
 */
@Component({
  selector: 'dba-upload-choice-modal',
  standalone: true,
  imports: [CelIconComponent],
  templateUrl: './upload-choice-modal.component.html',
  styleUrl: './upload-choice-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class UploadChoiceModalComponent {
  /** Visualise + share locally (no online profile). */
  readonly visualize = output<void>();
  /** Create an online profile (opens the publish flow on the portfolio). */
  readonly create = output<void>();
  /** Dismiss the modal. */
  readonly closed = output<void>();

  /** Close when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
