import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StoryObject } from '../../models/story.model';
import { formatCount, formatDuration } from '../../utils/format.util';
import { categoryIcon, fmtRange } from '../../utils/portfolio.util';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import { FilterDistributionComponent } from '../filter-distribution/filter-distribution.component';
import { ObjectImageComponent } from '../object-image/object-image.component';

/**
 * Compact horizontal object card (square thumb + meta + mini filter bar) used in
 * the equipment detail's "captured with this gear" grid. Its nights/date-range
 * line is scoped to the sessions that used the given equipment.
 */
@Component({
  selector: 'dba-mini-object-card',
  standalone: true,
  imports: [ObjectImageComponent, FilterDistributionComponent],
  templateUrl: './mini-object-card.component.html',
  styleUrl: './mini-object-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniObjectCardComponent {
  /** The object to render. */
  readonly obj = input.required<StoryObject>();
  /** Scope the nights/date-range to sessions that used this equipment id. */
  readonly equipId = input<string>('');
  /** Emits the object id when the card is opened. */
  readonly open = output<string>();

  /** Category glyph for the thumbnail placeholder. */
  protected readonly icon = computed<CelIconName>(() => categoryIcon(this.obj().category));

  /** Sessions scoped to this equipment (falls back to all when none match). */
  private readonly scopedSessions = computed(() => {
    const id = this.equipId();
    const all = this.obj().sessions;
    if (!id) {
      return all;
    }
    const using = all.filter((s) => s.equipmentIds.includes(id));
    return using.length ? using : all;
  });

  /** Number of scoped nights. */
  protected readonly nights = computed<number>(() => this.scopedSessions().length);
  /** Scoped first→latest date range. */
  protected readonly range = computed<string>(() => {
    const dates = this.scopedSessions()
      .map((s) => s.date)
      .filter(Boolean)
      .sort();
    return fmtRange(dates[0], dates[dates.length - 1]);
  });

  /** Formatted duration. */
  protected dur(s: number): string {
    return formatDuration(s);
  }
  /** Formatted count. */
  protected count(n: number): string {
    return formatCount(n);
  }
}
