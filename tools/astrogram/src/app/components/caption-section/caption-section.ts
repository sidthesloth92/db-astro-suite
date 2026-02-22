import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateInstagramCaption } from '../../models/card-data';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'dba-ag-caption-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './caption-section.html',
  styleUrls: ['./caption-section.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptionSectionComponent {
  private dataService = inject(CardDataService);
  
  cardData = this.dataService.cardData;
  copied = signal(false);

  formattedCaption = computed(() => generateInstagramCaption(this.cardData()));

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.formattedCaption());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  }
}
