import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StoryFilterTotal } from '../../models/story.model';
import type { FilterSlice } from '../../models/portfolio-view.types';
import { formatDuration } from '../../utils/format.util';
import { filterSlices } from '../../utils/portfolio.util';

/** A proportional filter-distribution bar with a labelled legend. */
@Component({
  selector: 'dba-filter-distribution',
  standalone: true,
  templateUrl: './filter-distribution.component.html',
  styleUrl: './filter-distribution.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterDistributionComponent {
  /** Summary-level per-filter totals. */
  readonly filters = input.required<readonly StoryFilterTotal[]>();
  /** Whether to show the labelled legend beneath the bar. */
  readonly legend = input<boolean>(true);
  /** Bar thickness: 'tall' (12px, summary panel) or 'mini' (5px, target cards). */
  readonly size = input<'tall' | 'mini'>('tall');
  /**
   * Story-wide colours for unknown filter names (see filterColorMap). Pass when
   * `filters` is a subset (target cards) so colours match the summary chart;
   * omitted, colours are assigned from `filters` itself.
   */
  readonly colors = input<ReadonlyMap<string, string> | null>(null);

  /** Proportional, ordered slices. */
  protected readonly slices = computed<FilterSlice[]>(() =>
    filterSlices(this.filters(), this.colors() ?? undefined),
  );

  /** Formats a duration for the legend. */
  protected dur(seconds: number): string {
    return formatDuration(seconds);
  }
}
