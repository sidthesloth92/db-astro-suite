import { Component, ChangeDetectionStrategy, inject, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataRowComponent, ProgressRingComponent } from '@db-astro-suite/ui';
import {
  FilterExposure,
  calculateTotalSeconds,
  formatDuration,
  calculateTotalIntegration,
} from '../../models/card-data.model';
import { BortleScaleComponent } from '../bortle-scale/bortle-scale';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';

/**
 * Pink-Nebula card layout. Renders inside `BaseCardPreviewComponent`
 * which owns the export pipeline (modern-screenshot). Public
 * `exportCard()` lets the surrounding shell trigger an export without
 * coupling to internals.
 */
@Component({
  selector: 'dba-ag-card-preview',
  standalone: true,
  imports: [
    CommonModule,
    BaseCardPreviewComponent,
    ProgressRingComponent,
    DataRowComponent,
    BortleScaleComponent,
  ],
  templateUrl: './card-preview.html',
  styleUrls: ['./card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPreviewComponent {
  readonly dataService = inject(CardDataService);
  readonly cardData = this.dataService.cardData;
  private readonly base = viewChild.required<BaseCardPreviewComponent>('base');

  /** Triggers the underlying export pipeline (used by the top bar). */
  exportCard(): void {
    this.base().exportCard();
  }

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

  /** Filter integration in hours for the ring `value` input. */
  filterHours(filter: FilterExposure): number {
    return calculateTotalSeconds(filter) / 3600;
  }

  /** Filter integration formatted as a readable string for the ring centre. */
  filterCenterText(filter: FilterExposure): string {
    return formatDuration(calculateTotalSeconds(filter));
  }

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
}
