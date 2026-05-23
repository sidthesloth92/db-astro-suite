import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Side of the rail the active-state highlight bar is rendered on. */
export type IconRailSide = 'left' | 'right';

/**
 * Single button inside an `IconRailComponent`. Mirrors one cell of the
 * `RailP` primitive from the direction-b-polished design: a stacked
 * icon + uppercase short label, with a coloured side bar when active.
 * The icon glyph is projected via `<ng-content>`.
 */
@Component({
  selector: 'dba-ui-icon-rail-item',
  standalone: true,
  templateUrl: './icon-rail-item.component.html',
  styleUrls: ['./icon-rail-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconRailItemComponent {
  /** Stable identifier used by the parent `IconRailComponent` to track selection. */
  id = input.required<string>();
  /** Accessible label / tooltip describing the item. */
  label = input<string>('');
  /** Short uppercase caption rendered under the icon (≤ 4 characters). */
  short = input<string>('');
  /** Whether this item is the currently selected one. */
  active = input<boolean>(false);
  /** Which edge of the rail the active highlight bar sits against. */
  side = input<IconRailSide>('left');

  /** Emits this item's `id` when clicked. */
  selected = output<string>();

  /** Internal click handler — emits the item id. */
  onClick(): void {
    this.selected.emit(this.id());
  }
}
