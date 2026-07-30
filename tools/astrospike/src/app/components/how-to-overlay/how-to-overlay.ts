import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  TextButtonComponent,
  circleHelpIcon,
  closeIcon,
} from '@db-astro-suite/ui';
import { HOW_TO_STEPS } from '../../constants/how-to.constants';

/**
 * The how-to overlay: five numbered steps on a blurred scrim, opened from the
 * title bar.
 *
 * It floats over the whole studio rather than living in the controls pane,
 * because it explains the canvas as much as the controls and the pane has no
 * room to spare. It is never shown unprompted, so there is nothing to remember
 * about having dismissed it and no storage to touch.
 */
@Component({
  selector: 'dba-as-how-to-overlay',
  standalone: true,
  imports: [IconButtonComponent, IconComponent, TextButtonComponent],
  templateUrl: './how-to-overlay.html',
  styleUrl: './how-to-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToOverlay {
  /** Emitted when the user dismisses the overlay. */
  readonly closed = output<void>();

  /** The steps rendered as numbered rows. */
  protected readonly steps = HOW_TO_STEPS;

  /** Header glyph. */
  protected readonly circleHelpIcon = circleHelpIcon;

  /** Dismiss glyph. */
  protected readonly closeIcon = closeIcon;

  /** Dismisses the overlay. */
  protected onClose(): void {
    this.closed.emit();
  }
}
