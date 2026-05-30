import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * 56px application top bar. Mirrors the `TopBarP` primitive from the
 * direction-b-polished design — three-region layout: brand on the
 * left, centred tabs in the middle, actions on the right.
 *
 * Slot map:
 * - `[slot=brand]` — left brand/logo area
 * - `[slot=tabs]` — centred mode tabs (typically `<dba-ui-segmented-tabs>`)
 * - `[slot=actions]` — right-aligned action buttons (typically Export)
 */
@Component({
  selector: 'dba-ui-top-bar',
  standalone: true,
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {}
