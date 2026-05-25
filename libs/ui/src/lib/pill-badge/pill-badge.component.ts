import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Colour tones supported by `PillBadgeComponent`. */
export type PillBadgeTone = 'pink' | 'cyan' | 'orange';

/**
 * Compact uppercase mono badge. Mirrors the `Pill` primitive from the
 * direction-b-polished design — a small inline tag with a coloured border
 * and translucent background. Label content is projected via `<ng-content>`.
 */
@Component({
  selector: 'dba-ui-pill-badge',
  standalone: true,
  templateUrl: './pill-badge.component.html',
  styleUrls: ['./pill-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PillBadgeComponent {
  /** Visual tone of the pill. Defaults to `'cyan'`. */
  tone = input<PillBadgeTone>('cyan');
}
