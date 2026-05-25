import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Visual variant supported by `TextButtonComponent`. */
export type TextButtonVariant = 'primary' | 'secondary';

/** Size preset supported by `TextButtonComponent`. */
export type TextButtonSize = 'sm' | 'md';

/** Acceptable shape for the `routerLink` input — matches Angular's `RouterLink`. */
export type TextButtonRouterLink = string | readonly unknown[] | null;

/**
 * Generic text CTA used across the Direction B Polished UI. `primary`
 * renders as a solid pink button with white text and a soft shadow;
 * `secondary` renders as a transparent button with a tokenized border
 * that brightens on hover. Trailing / leading glyphs may be projected
 * via `<ng-content>` so the button can host icons next to the label.
 *
 * The component renders as one of three elements depending on inputs:
 *
 * - `<button>` (default) — fires the `clicked` output on activation.
 * - `<a [routerLink]>` — set the `routerLink` input for an internal link.
 *   This avoids invalid `<a><button></button></a>` nesting at call sites.
 * - `<a [href] target="_blank" rel="noopener noreferrer">` — set the
 *   `href` input for an external link. `target` + `rel` are applied for
 *   safe external navigation.
 *
 * When rendering as an anchor, `disabled` is surfaced via
 * `aria-disabled` (HTML5 disallows the native `disabled` attribute on
 * `<a>`), and the `clicked` output is still emitted alongside default
 * navigation so analytics handlers can fire.
 */
@Component({
  selector: 'dba-ui-text-button',
  standalone: true,
  imports: [RouterLink],
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
  /**
   * When set, the component renders as `<a [routerLink]>` (internal
   * navigation) instead of `<button>`. Takes precedence over `href`.
   */
  routerLink = input<TextButtonRouterLink>(null);
  /**
   * When set (and `routerLink` is `null`), the component renders as
   * `<a [href]>` with `target="_blank" rel="noopener noreferrer"` —
   * external link semantics.
   */
  href = input<string | null>(null);

  /**
   * Emitted when the user activates the button (click / Enter / Space).
   * The underlying DOM `Event` is forwarded so callers can call
   * `stopPropagation()` when the button is nested inside another
   * click-handling container.
   */
  clicked = output<Event>();

  /** Resolves the active render mode based on the supplied inputs. */
  readonly renderMode = computed<'router' | 'href' | 'button'>(() => {
    if (this.routerLink() !== null) {
      return 'router';
    }
    if (this.href() !== null) {
      return 'href';
    }
    return 'button';
  });

  /** Internal click handler — emits `clicked` unless the button is disabled. */
  onClick(event: Event): void {
    if (this.disabled()) {
      // Prevent navigation on the anchor variants when disabled.
      event.preventDefault();
      return;
    }
    this.clicked.emit(event);
  }
}
