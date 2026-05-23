import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

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

  /** Collapses the sheet (called by the X button). */
  collapse(): void {
    this.expanded.set(false);
  }
}
