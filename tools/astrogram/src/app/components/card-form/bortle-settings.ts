import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardDataService } from '../../services/card-data.service';
import { ANALYTICS_SERVICE_TOKEN } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-ag-bortle-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-container">
      <div class="bortle-control">
        <div class="bortle-visual">
          @for (n of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track n) {
            <button
              type="button"
              class="bortle-step"
              [class.active]="cardData().bortleScale === n"
              [style.background]="'rgba(255, 45, 149, ' + n / 10 + ')'"
              (click)="updateBortle(n)"
            >
              {{ n }}
            </button>
          }
        </div>
        <div class="bortle-info">
          Level: <span class="highlight">{{ cardData().bortleScale }}</span>
        </div>
      </div>
    </div>
  `
})
export class BortleSettingsComponent {
  private analyticsService = inject(ANALYTICS_SERVICE_TOKEN);
  dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  updateBortle(n: number) {
    try {
      this.analyticsService.trackSettingChanged('bortle_scale', n);
    } catch (e) {
      console.error('Analytics tracking error:', e);
    }
    this.dataService.updateData({ bortleScale: n });
  }
}
