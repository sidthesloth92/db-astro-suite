import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BRAND_CYAN, BRAND_PINK } from '../../models/brand.constants';
import type { MoonPhase } from '../../models/portfolio-view.types';
import { moonPhases } from '../../utils/moon.util';

let timelineUid = 0;

/** A small from→now moon-phase timeline (new → full, cyan → pink). */
@Component({
  selector: 'dba-moon-phase-timeline',
  standalone: true,
  templateUrl: './moon-phase-timeline.component.html',
  styleUrl: './moon-phase-timeline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoonPhaseTimelineComponent {
  /** Number of phase disks. */
  readonly count = input<number>(5);

  /** Unique gradient id. */
  protected readonly uid = `mpt-${timelineUid++}`;
  protected readonly cyan = BRAND_CYAN;
  protected readonly pink = BRAND_PINK;

  /** The phase disks, laid out across the 300×44 viewBox. */
  protected readonly phases: MoonPhase[] = moonPhases(5, 30, 270, 22, 11);
}
