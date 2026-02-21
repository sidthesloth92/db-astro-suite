import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent, TextareaComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { AstroInfoService } from '../../services/astro-info.service';

@Component({
  selector: 'ac-image-details',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TextareaComponent],
  template: `
    <div class="form-container">
      <div class="form-row items-end gap-2 mb-sm">
        <db-input
          label="Object Name"
          [value]="cardData().title"
          (valueChange)="updateData('title', $event)"
          placeholder="e.g., Pillars of Creation"
          class="flex-1"
        ></db-input>
      </div>

      <db-textarea
        label="📝 Description"
        [value]="cardData().description"
        (valueChange)="updateData('description', $event)"
        placeholder="Brief description of the object..."
        [rows]="3"
      ></db-textarea>

      <div class="form-row mb-sm">
        <db-input
          type="date"
          label="📅 Date"
          [value]="cardData().date"
          (valueChange)="updateData('date', $event)"
          class="flex-1"
        ></db-input>
        <db-input
          label="📍 Location"
          [value]="cardData().location"
          (valueChange)="updateData('location', $event)"
          placeholder="City, State"
          class="flex-1"
        ></db-input>
      </div>

      <div class="form-row mb-sm">
        <db-input
          label="👤 Author Handle"
          [value]="cardData().author"
          (valueChange)="updateData('author', $event)"
          placeholder="@username"
          class="flex-1"
        ></db-input>
        <db-input
          label="🏷️ Hashtags"
          [value]="cardData().hashtags || ''"
          (valueChange)="updateData('hashtags', $event)"
          placeholder="#space #nebula"
          class="flex-1"
        ></db-input>
      </div>
    </div>
  `
})
export class ImageDetailsComponent {
  dataService = inject(CardDataService);
  astroInfo = inject(AstroInfoService);
  cardData = this.dataService.cardData;

  isFetching = signal(false);

  updateData(field: string, value: any) {
    this.dataService.updateData({ [field]: value });
  }

  async fetchObjectInfo() {
    if (!this.cardData().title || this.isFetching()) return;
    
    this.isFetching.set(true);
    try {
      const info = await this.astroInfo.getObjectDescription(this.cardData().title);
      if (info) {
        this.updateData('description', info.extract);
      }
    } finally {
      this.isFetching.set(false);
    }
  }
}
