import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NeonButtonComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { FilterExposure } from '../../models/card-data';

@Component({
  selector: 'dba-ag-integration-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-container">
      <div class="filters-list">
        @for (filter of cardData().filters; track i; let i = $index) {
          <div class="filter-row-complex" [class.disabled]="!filter.enabled">
            <div class="filter-main">
              <div class="filter-chip-group">
                <button
                  type="button"
                  class="filter-chip"
                  [style.borderColor]="filter.color"
                  [style.background]="filter.enabled ? filter.color + '20' : 'transparent'"
                  [style.color]="filter.enabled ? '#fff' : '#666'"
                  (click)="toggleFilter(i)"
                >
                  <div class="status-dot-mini" [style.background]="filter.enabled ? filter.color : 'transparent'"></div>
                  @if (i < 7) {
                    <span>{{ filter.name }}</span>
                  }
                </button>
                @if (i >= 7) {
                  <input
                    type="text"
                    [ngModel]="filter.name"
                    (ngModelChange)="updateFilter(i, 'name', $event)"
                    class="filter-name-input-ag"
                    [style.color]="filter.enabled ? '#fff' : '#666'"
                    [style.borderColor]="filter.color"
                    placeholder="Name"
                  />
                }
              </div>
              <input
                type="color"
                [ngModel]="filter.color"
                (ngModelChange)="updateFilter(i, 'color', $event)"
                class="filter-color-btn"
              />
            </div>

            @if (filter.enabled) {
              <div class="filter-inputs">
                <div class="mini-input-group">
                  <input
                    type="number"
                    [ngModel]="filter.frames"
                    (ngModelChange)="updateFilter(i, 'frames', $event)"
                    min="0"
                  />
                  <span>fr</span>
                </div>
                <span class="op-x">×</span>
                <div class="mini-input-group">
                  <input
                    type="number"
                    [ngModel]="filter.seconds"
                    (ngModelChange)="updateFilter(i, 'seconds', $event)"
                    min="0"
                  />
                  <span>s</span>
                </div>
              </div>
            }

            @if (i >= 7) {
              <button type="button" class="delete-action-btn" (click)="removeFilter(i)">✕</button>
            }
          </div>
        }
      </div>

      <button type="button" class="subtle-add-btn" (click)="addCustomFilter()">
        + Add Custom Filter
      </button>
    </div>
  `
})
export class IntegrationSettingsComponent {
  dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  toggleFilter(index: number) {
    this.dataService.mutateData((data) => {
      data.filters[index].enabled = !data.filters[index].enabled;
    });
  }

  updateFilter(index: number, field: keyof FilterExposure, value: any) {
    this.dataService.mutateData((data) => {
      (data.filters[index] as any)[field] = value;
    });
  }

  addCustomFilter() {
    this.dataService.mutateData((data) => {
      data.filters.push({
        name: 'Custom',
        color: '#ff00ff',
        frames: 0,
        seconds: 0,
        enabled: true
      });
    });
  }

  removeFilter(index: number) {
    this.dataService.mutateData((data) => {
      data.filters.splice(index, 1);
    });
  }
}
