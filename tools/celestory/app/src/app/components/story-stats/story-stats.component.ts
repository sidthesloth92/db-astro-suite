import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { CelestoryStory } from '../../models/story.model';
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
 * targets/nights/frames strip, and the filter distribution. Driven entirely by
 * a `story` input so it works in both the client-side preview and the SSR
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
  /** The story to render. */
  readonly story = input.required<CelestoryStory>();

  /** Hero total integration, formatted as "186h 46m". */
  protected readonly heroIntegration = computed(() =>
    formatDuration(this.story().summary.totalIntegrationSeconds),
  );

  /** Targets / nights / frames, formatted. */
  protected readonly targetCount = computed(() =>
    formatCount(this.story().summary.targetCount),
  );
  protected readonly nightCount = computed(() =>
    formatCount(this.story().summary.nightCount),
  );
  protected readonly frameCount = computed(() =>
    formatCount(this.story().summary.lightFrameCount),
  );

  /** Filter distribution as proportional bar segments. */
  protected readonly filters = computed<FilterBar[]>(() => {
    const filters = this.story().summary.filters;
    const total = filters.reduce((sum, f) => sum + f.seconds, 0) || 1;
    return filters.map((f) => ({
      name: f.name,
      label: formatDuration(f.seconds),
      color: filterColor(f.name),
      pct: (f.seconds / total) * 100,
    }));
  });
}
