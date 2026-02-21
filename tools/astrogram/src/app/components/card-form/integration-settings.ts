import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NeonButtonComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'ac-integration-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NeonButtonComponent],
  template: `
      <div class="filters-list">
        @for (filter of cardData().filters; track filter.name; let i = $index) {
          <div class="filter-row-complex" [class.disabled]="!filter.enabled">
            <div class="filter-main">
              <button
                type="button"
                class="filter-chip"
                [style.borderColor]="filter.color"
                [style.background]="filter.enabled ? filter.color + '20' : 'transparent'"
                [style.color]="filter.enabled ? filter.color : '#666'"
                (click)="toggleFilter(i)"
              >
                {{ filter.name }}
              </button>
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

      <db-neon-button variant="secondary" fullWidth (click)="addCustomFilter()">
        + Add Custom Filter
      </db-neon-button>
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

  updateFilter(index: number, field: 'color'|'frames'|'seconds', value: any) {
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
