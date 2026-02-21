import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NeonButtonComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'ac-software-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-container">
      <div class="items-editor">
        @for (item of cardData().software; track $index; let i = $index) {
          <div class="equipment-row-complex">
            <input
              type="text"
              [ngModel]="item.icon"
              (ngModelChange)="updateSoftware(i, 'icon', $event)"
              class="icon-picker-mini db-form-input"
              maxlength="2"
            />
            <div class="item-fields">
              <input
                type="text"
                [ngModel]="item.label"
                (ngModelChange)="updateSoftware(i, 'label', $event)"
                class="db-form-input field-label"
                placeholder="Type"
              />
              <input
                type="text"
                [ngModel]="item.name"
                (ngModelChange)="updateSoftware(i, 'name', $event)"
                class="db-form-input field-value"
                placeholder="Software Name"
              />
            </div>
            <button type="button" class="delete-action-btn" (click)="removeSoftware(i)">✕</button>
          </div>
        }
      </div>

      <button type="button" class="subtle-add-btn" (click)="addSoftware()">
        + Add Software
      </button>
    </div>
  `
})
export class SoftwareSettingsComponent {
  dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  updateSoftware(index: number, field: string, value: any) {
    this.dataService.mutateData((data) => {
      (data.software[index] as any)[field] = value;
    });
  }

  addSoftware() {
    this.dataService.mutateData((data) => {
      data.software.push({ icon: '📦', label: '', name: '' });
    });
  }

  removeSoftware(index: number) {
    this.dataService.mutateData((data) => {
      data.software.splice(index, 1);
    });
  }
}
