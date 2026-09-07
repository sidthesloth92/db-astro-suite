import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DataRowComponent, ProgressRingComponent } from '@db-astro-suite/ui';
import {
  FilterExposure,
  calculateTotalIntegration,
  calculateTotalSeconds,
  formatDuration,
} from '../../../models/card-data.model';
import { BortleScaleComponent } from '../../bortle-scale/bortle-scale';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Pink Nebula theme — Astrogram's original card design, restored.
 *
 * Unlike the ported design-source themes it paints no background of its
 * own: the translucent hero / integration / gear panels sit directly over
 * the user's uploaded image, with their opacity driven by the Layout
 * panel's card-opacity slider. Authored on the original 480 × 640 card,
 * which the theme registry declares as this theme's design basis.
 */
@Component({
  selector: 'dba-ag-pink-nebula-theme',
  standalone: true,
  imports: [ProgressRingComponent, DataRowComponent, BortleScaleComponent],
  templateUrl: './pink-nebula-theme.component.html',
  styleUrl: './pink-nebula-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinkNebulaThemeComponent extends CardThemeBaseDirective {
  /** Active filters that contribute to the integration rings. */
  readonly enabledFilters = computed(() =>
    this.cardData().filters.filter((f) => f.enabled && f.frames > 0),
  );

  /** Total integration in seconds across active filters. */
  readonly totalIntegrationSeconds = computed(() =>
    calculateTotalIntegration(this.cardData().filters),
  );

  /** Total integration formatted as "Hh Mm". */
  readonly totalIntegration = computed(() => formatDuration(this.totalIntegrationSeconds()));

  /** Total integration in hours for the ring `total` input. */
  readonly totalIntegrationHours = computed(() => this.totalIntegrationSeconds() / 3600);

  /** Date formatted as a long human-readable string. */
  readonly formattedDate = computed(() => {
    const dateStr = this.cardData().date;
    if (!dateStr) {
      return '';
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  /** Filter integration in hours for the ring `value` input. */
  filterHours(filter: FilterExposure): number {
    return calculateTotalSeconds(filter) / 3600;
  }

  /**
   * Resolves the ring colour: OIII pulls from the secondary accent so the
   * design's cyan treatment flows through the Layout panel. Other filters
   * keep their own per-filter colour.
   */
  ringColor(filter: FilterExposure): string {
    if (filter.name.toUpperCase().includes('OIII')) {
      return this.cardData().secondaryAccentColor || filter.color;
    }
    return filter.color;
  }

  /** Filter integration formatted as a readable string for the ring centre. */
  filterCenterText(filter: FilterExposure): string {
    return formatDuration(calculateTotalSeconds(filter));
  }
}
