import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { IconRailSide } from './icon-rail-item.component';

/**
 * Thin 60px icon rail used to switch between inspector sections.
 * Mirrors the `RailP` primitive from the direction-b-polished design.
 * Children (`<dba-ui-icon-rail-item>` instances) are projected via the
 * default content slot; arbitrary dividers (e.g. `<hr>`) may be
 * interspersed to visually group items.
 */
@Component({
  selector: 'dba-ui-icon-rail',
  standalone: true,
  templateUrl: './icon-rail.component.html',
  styleUrls: ['./icon-rail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconRailComponent {
  /** Which side of the parent surface the rail sits on (affects border). */
  side = input<IconRailSide>('left');
}
