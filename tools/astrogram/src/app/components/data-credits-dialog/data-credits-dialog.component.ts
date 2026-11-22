import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconButtonComponent, IconComponent, closeIcon } from '@db-astro-suite/ui';
import { DATA_CREDIT_GROUPS } from './data-credits.constants';

/**
 * Dialog listing every third-party source behind Astrogram's plate solving,
 * star map labels, distances and Wiki descriptions, with the credit and
 * license each one asks for. Presentational: the parent owns the open state.
 */
@Component({
  selector: 'dba-ag-data-credits-dialog',
  standalone: true,
  imports: [IconButtonComponent, IconComponent],
  templateUrl: './data-credits-dialog.component.html',
  styleUrl: './data-credits-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataCreditsDialogComponent {
  /** Whether the dialog is showing. */
  readonly open = input(false);

  /** Emitted when the user closes the dialog (close button, Escape or backdrop). */
  readonly closed = output<void>();

  /** Grouped credits rendered in the dialog. */
  protected readonly groups = DATA_CREDIT_GROUPS;

  /** Close glyph for the top-right close button. */
  protected readonly closeIcon = closeIcon;

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Move focus into the dialog when it opens so Escape and Tab work at once.
    effect(() => {
      if (!this.open()) return;
      this.dialog()?.nativeElement.focus();
    });
  }
}
