import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FilterExposure,
  calculateTotalSeconds,
  formatDuration,
  calculateTotalIntegration,
} from '../../models/card-data';
import { FilterRingComponent } from '../filter-ring/filter-ring';
import { BortleScaleComponent } from '../bortle-scale/bortle-scale';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';

@Component({
  selector: 'dba-ag-card-preview',
  standalone: true,
  imports: [CommonModule, FilterRingComponent, BortleScaleComponent, BaseCardPreviewComponent],
  templateUrl: './card-preview.html',
  styleUrls: ['./card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPreviewComponent {
  dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  enabledFilters = computed(() => this.cardData().filters.filter((f) => f.enabled && f.frames > 0));

  totalIntegrationSeconds = computed(() => calculateTotalIntegration(this.cardData().filters));

  totalIntegration = computed(() => formatDuration(this.totalIntegrationSeconds()));

  getFilterDuration(filter: FilterExposure): string {
    return formatDuration(calculateTotalSeconds(filter));
  }

  getFilterProgress(filter: FilterExposure): number {
    const total = this.totalIntegrationSeconds();
    if (total === 0) return 0;
    return (calculateTotalSeconds(filter) / total) * 100;
  }

  formattedDate = computed(() => {
    const dateStr = this.cardData().date;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  });
}
