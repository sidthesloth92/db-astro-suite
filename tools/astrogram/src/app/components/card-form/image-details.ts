import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent, TextareaComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { AstroInfoService } from '../../services/astro-info.service';

@Component({
  selector: 'dba-ag-image-details',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TextareaComponent],
  template: `
    <div class="form-container">
      <div class="form-row items-end gap-2 mb-sm">
        <dba-ui-input
          label="Object Name"
          [value]="cardData().title"
          (valueChange)="updateData('title', $event)"
          placeholder="e.g., Pillars of Creation"
          class="flex-1"
        ></dba-ui-input>
      </div>

      <div class="description-section">
        <div class="description-header">
          <label class="db-form-label" style="margin-bottom: 0px;">📝 Description</label>
          <div class="fetch-group">
            <input
              id="dso-search-input"
              type="text"
              class="mini-search"
              placeholder="Search wiki..."
              [value]="searchQuery()"
              (input)="updateSearch($event)"
              (keydown.enter)="fetchObjectInfo()"
            />
            <button
              class="fetch-btn"
              (click)="fetchObjectInfo()"
              [disabled]="!searchQuery() || isFetching()"
            >
              {{ isFetching() ? '⌛' : 'Find' }}
            </button>
          </div>
        </div>
        <dba-ui-textarea
          [value]="cardData().description"
          (valueChange)="updateData('description', $event)"
          placeholder="Brief description of the object..."
          [rows]="5"
        ></dba-ui-textarea>
      </div>

      <div class="form-row mb-sm">
        <dba-ui-input
          type="date"
          label="📅 Date"
          [value]="cardData().date"
          (valueChange)="updateData('date', $event)"
          class="flex-1"
        ></dba-ui-input>
        <dba-ui-input
          label="📍 Location"
          [value]="cardData().location"
          (valueChange)="updateData('location', $event)"
          placeholder="City, State"
          class="flex-1"
        ></dba-ui-input>
      </div>

      <div class="form-row mb-sm">
        <dba-ui-input
          label="👤 Author Handle"
          [value]="cardData().author"
          (valueChange)="updateData('author', $event)"
          placeholder="@username"
          class="flex-1"
        ></dba-ui-input>
        <dba-ui-input
          label="🏷️ Hashtags"
          [value]="cardData().hashtags || ''"
          (valueChange)="updateData('hashtags', $event)"
          placeholder="#space #nebula"
          class="flex-1"
        ></dba-ui-input>
      </div>
    </div>
  `,
})
export class ImageDetailsComponent {
  dataService = inject(CardDataService);
  astroInfo = inject(AstroInfoService);
  cardData = this.dataService.cardData;

  isFetching = signal(false);
  searchQuery = signal('');

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  updateData(field: string, value: any) {
    this.dataService.updateData({ [field]: value });
  }

  async fetchObjectInfo() {
    const query = this.searchQuery();
    if (!query || this.isFetching()) return;

    this.isFetching.set(true);
    try {
      const info = await this.astroInfo.getObjectDescription(query);
      if (info) {
        this.updateData('description', info.extract);
      }
    } finally {
      this.isFetching.set(false);
    }
  }
}
