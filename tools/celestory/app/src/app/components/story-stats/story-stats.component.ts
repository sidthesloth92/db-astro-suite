import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { CelestoryLedger } from '../../models/ledger.model';
import { filterColor } from '../../utils/filter-color.util';
import { formatCount, formatDuration } from '../../utils/format.util';

/** A single filter bar segment for the distribution chart. */
interface FilterBar {
  name: string;
  label: string;
  color: string;
  pct: number;
}

/**
 * Presentational stats renderer — the hero integration number, the
 * objects/nights/frames strip, and the filter distribution. Driven entirely by
 * a `ledger` input so it works in both the client-side preview and the SSR
 * portfolio page.
 */
@Component({
  selector: 'dba-story-stats',
  standalone: true,
  templateUrl: './story-stats.component.html',
  styleUrl: './story-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryStatsComponent {
  /** The ledger to render. */
  readonly ledger = input.required<CelestoryLedger>();

  /** Hero total integration, formatted as "186h 46m". */
  protected readonly heroIntegration = computed(() =>
    formatDuration(this.ledger().summary.totalIntegrationSeconds),
  );

  /** Objects / nights / frames, formatted. */
  protected readonly objectCount = computed(() =>
    formatCount(this.ledger().summary.objectCount),
  );
  protected readonly nightCount = computed(() =>
    formatCount(this.ledger().summary.nightCount),
  );
  protected readonly frameCount = computed(() =>
    formatCount(this.ledger().summary.lightFrameCount),
  );

  /** Filter distribution as proportional bar segments. */
  protected readonly filters = computed<FilterBar[]>(() => {
    const filters = this.ledger().summary.filters;
    const total = filters.reduce((sum, f) => sum + f.seconds, 0) || 1;
    return filters.map((f) => ({
      name: f.name,
      label: formatDuration(f.seconds),
      color: filterColor(f.name),
      pct: (f.seconds / total) * 100,
    }));
  });
}
