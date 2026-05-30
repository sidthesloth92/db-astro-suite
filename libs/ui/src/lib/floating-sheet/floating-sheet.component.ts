import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { closeIcon } from '../icons/close.icon';

/**
 * Floating, semi-transparent backdrop-blurred bottom sheet for the
 * mobile shell. Mirrors the `FloatingMobileControls` primitive from
 * the direction-b-polished design.
 *
 * `expanded` is a `model<boolean>()` so the parent can bind to it
 * with `[(expanded)]` and the sheet can collapse itself via the X
 * button. The body and bottom nav are projected — body via the
 * default slot, nav via `[slot=nav]`.
 */
@Component({
  selector: 'dba-ui-floating-sheet',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './floating-sheet.component.html',
  styleUrls: ['./floating-sheet.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingSheetComponent {
  /** Whether the sheet's body is expanded (model — use `[(expanded)]`). */
  expanded = model<boolean>(false);
  /** Title shown at the top of the expanded sheet. */
  title = input<string>('');
  /** Cap on the sheet's expanded height, as a percentage of the viewport. */
  maxHeightPercent = input<number>(70);

  /** Close glyph used by the collapse button in the sheet header. */
  protected readonly closeIcon = closeIcon;

  /** Scrollable body element — used to reset scroll position on (re)open. */
  private readonly bodyRef = viewChild<ElementRef<HTMLElement>>('body');

  constructor() {
    // Reset the body's scroll position whenever the sheet opens or the
    // active section changes (signalled via the `title` input). Without
    // this the previous panel's scroll offset carries over and the user
    // sees a panel that starts partway down.
    effect(() => {
      const isOpen = this.expanded();
      // Subscribe to title changes too, so switching sections while open
      // also resets — `void` keeps the reactive read without a TS warning.
      void this.title();
      if (!isOpen) {
        return;
      }
      const body = this.bodyRef()?.nativeElement;
      if (body) {
        body.scrollTop = 0;
      }
    });
  }

  /** Collapses the sheet (called by the X button). */
  collapse(): void {
    this.expanded.set(false);
  }
}
