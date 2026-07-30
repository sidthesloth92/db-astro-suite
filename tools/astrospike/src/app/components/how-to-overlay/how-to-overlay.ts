import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  STORAGE_SERVICE_TOKEN,
  SwitchComponent,
  TextButtonComponent,
  circleHelpIcon,
  closeIcon,
} from '@db-astro-suite/ui';
import { HOW_TO_DISMISSED_KEY, HOW_TO_STEPS } from '../../constants/how-to.constants';

/**
 * The how-to overlay: five numbered steps on a blurred scrim, reachable from
 * the title bar and shown unprompted the first time someone arrives.
 *
 * It floats over the whole studio rather than living in the controls pane,
 * because it explains the canvas as much as the controls and the pane has no
 * room to spare. Dismissal can be made permanent, which is why this is the one
 * component here that touches storage.
 */
@Component({
  selector: 'dba-as-how-to-overlay',
  standalone: true,
  imports: [IconButtonComponent, IconComponent, SwitchComponent, TextButtonComponent],
  templateUrl: './how-to-overlay.html',
  styleUrl: './how-to-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToOverlay {
  /** Emitted when the user dismisses the overlay. */
  readonly closed = output<void>();

  /** Browser storage, for the "don't show this again" choice. */
  private readonly storage = inject(STORAGE_SERVICE_TOKEN);

  /** The steps rendered as numbered rows. */
  protected readonly steps = HOW_TO_STEPS;

  /** Header glyph. */
  protected readonly circleHelpIcon = circleHelpIcon;

  /** Dismiss glyph. */
  protected readonly closeIcon = closeIcon;

  /** Whether the user has asked not to see this again. */
  protected readonly isSuppressed = signal(false);

  /**
   * Records or clears the suppression immediately rather than on dismiss, so
   * the switch means what it says even if the overlay is closed with Escape or
   * a click on the scrim.
   * @param suppressed The switch's new state.
   */
  protected onSuppressChange(suppressed: boolean): void {
    this.isSuppressed.set(suppressed);
    if (suppressed) {
      this.storage.setItem(HOW_TO_DISMISSED_KEY, '1');
    } else {
      this.storage.removeItem(HOW_TO_DISMISSED_KEY);
    }
  }

  /** Dismisses the overlay. */
  protected onClose(): void {
    this.closed.emit();
  }
}
