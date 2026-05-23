import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Visual variant supported by `TextButtonComponent`. */
export type TextButtonVariant = 'primary' | 'secondary';

/** Size preset supported by `TextButtonComponent`. */
export type TextButtonSize = 'sm' | 'md';

/**
 * Generic text CTA used across the Direction B Polished UI. `primary`
 * renders as a solid pink button with white text and a soft shadow;
 * `secondary` renders as a transparent button with a tokenized border
 * that brightens on hover. Trailing / leading glyphs may be projected
 * via `<ng-content>` so the button can host icons next to the label.
 */
@Component({
  selector: 'dba-ui-text-button',
  standalone: true,
  templateUrl: './text-button.component.html',
  styleUrl: './text-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextButtonComponent {
  /** User-visible label rendered inside the button. */
  label = input.required<string>();
  /** Visual variant. Defaults to `'primary'`. */
  variant = input<TextButtonVariant>('primary');
  /** Whether the button is disabled and non-interactive. Defaults to `false`. */
  disabled = input<boolean>(false);
  /** Size preset (`'sm'` or `'md'`). Defaults to `'md'`. */
  size = input<TextButtonSize>('md');

  /** Emitted when the user activates the button (click / Enter / Space). */
  clicked = output<void>();

  /** Internal click handler — emits `clicked` unless the button is disabled. */
  onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.clicked.emit();
  }
}
