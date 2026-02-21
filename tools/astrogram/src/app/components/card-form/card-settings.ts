import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent, SliderComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'ac-card-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, SliderComponent],
  template: `
    <div class="form-container">
      <db-select
        label="Aspect Ratio"
        [value]="cardData().aspectRatio"
        (valueChange)="updateData('aspectRatio', $event)"
        [noBox]="true"
        [options]="[
          { label: '3:4 - 1080 x 1440 - New Insta Post', value: '3:4' },
          { label: '4:5 - 1080 x 1350 - Old Insta Post', value: '4:5' },
        ]"
        style="margin-bottom: -0.75rem; display: block;"
      ></db-select>

      <div class="form-row compact">
        <div class="db-form-group">
          <label class="db-form-label">Accent Color</label>
          <div class="color-picker-wrapper">
            <input
              type="color"
              [ngModel]="cardData().accentColor"
              (ngModelChange)="onAccentColorChange($event)"
            />
            <span class="color-val">{{ cardData().accentColor }}</span>
          </div>
        </div>

        <div class="db-form-group">
          <label class="db-form-label">Background</label>
          <div class="image-upload-mini">
            @if (cardData().backgroundImage) {
              <div class="mini-preview">
                <img [src]="cardData().backgroundImage" alt="" />
                <button type="button" class="mini-remove" (click)="updateData('backgroundImage', null)">✕</button>
              </div>
            } @else {
              <label class="mini-upload">
                <input type="file" accept="image/*" (change)="onImageUpload($event)" hidden />
                <span>Upload</span>
              </label>
            }
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="db-form-group">
          <db-slider
            label="Card Transparency"
            [value]="cardData().cardOpacity * 100"
            [min]="0"
            [max]="100"
            [step]="5"
            [precision]="0"
            (valueChange)="updateData('cardOpacity', $event / 100)"
          ></db-slider>
        </div>
      </div>
    </div>
  `
})
export class CardSettingsComponent {
  dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  updateData(field: string, value: any) {
    this.dataService.updateData({ [field]: value });
  }

  onAccentColorChange(hex: string) {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    this.dataService.updateData({ 
      accentColor: hex,
      accentColorRgb: `${r}, ${g}, ${b}`
    });
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.updateData('backgroundImage', e.target?.result as string);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
}
