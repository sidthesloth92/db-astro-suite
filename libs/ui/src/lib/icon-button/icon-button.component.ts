import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Accent colours supported by `IconButtonComponent`. */
export type IconButtonAccent = 'pink' | 'cyan' | 'red';

/**
 * Square icon button used in chrome (top bars, floating toolbars, etc.).
 * Mirrors the `IconBtn` primitive from the direction-b-polished design:
 * a single-icon button with active/idle states and a pink or cyan accent.
 * The icon glyph is projected via `<ng-content>`.
 */
@Component({
  selector: 'dba-ui-icon-button',
  standalone: true,
  templateUrl: './icon-button.component.html',
  styleUrls: ['./icon-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
  /** Whether the button is in its "active"/pressed state (e.g. currently selected tool). */
  active = input<boolean>(false);
  /**
   * Whether the button is in its "success" state — green confirmation paint,
   * regardless of `accent`. Use for transient post-action feedback like
   * "copied!" on a clipboard button. Separate from `active` so a button can
   * signal "currently selected" (active, accent-coloured) and "just succeeded"
   * (success, green) independently.
   */
  success = input<boolean>(false);
  /** Accent colour applied on hover and when `active`. Defaults to `'cyan'`. */
  accent = input<IconButtonAccent>('cyan');
  /** Edge length, in CSS pixels, of the button square. Defaults to 36. */
  size = input<number>(36);
  /** Accessible / tooltip title for the button. */
  title = input<string>('');
  /** Whether the button is disabled and non-interactive. */
  disabled = input<boolean>(false);

  /** Emitted when the user activates the button (click / Enter / Space). */
  clicked = output<void>();

  /** Internal click handler — forwards to the `clicked` output. */
  onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.clicked.emit();
  }
}
