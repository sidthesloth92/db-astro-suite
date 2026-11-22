import { Injectable, signal } from '@angular/core';

/**
 * Open state of Astrogram's Data credits dialog. The star map's credit line
 * opens it; the app root renders the dialog so it sits above the scaled
 * preview containers.
 */
@Injectable({
  providedIn: 'root',
})
export class DataCreditsDialogService {
  private readonly openState = signal(false);

  /** True while the Data credits dialog is showing. */
  readonly isOpen = this.openState.asReadonly();

  /** Shows the Data credits dialog. */
  open(): void {
    this.openState.set(true);
  }

  /** Hides the Data credits dialog. */
  close(): void {
    this.openState.set(false);
  }
}
