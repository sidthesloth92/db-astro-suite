import { Component, Input, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  CardData, 
  FilterExposure,
  calculateTotalSeconds, 
  formatDuration, 
  calculateTotalIntegration,
  ASPECT_RATIOS 
} from '../../models/card-data';
import { FilterRingComponent } from '../filter-ring/filter-ring';
import { BortleScaleComponent } from '../bortle-scale/bortle-scale';
import { NeonButtonComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'ac-card-preview',
  standalone: true,
  imports: [CommonModule, FilterRingComponent, BortleScaleComponent, NeonButtonComponent],
  templateUrl: './card-preview.html',
  styleUrl: './card-preview.css'
})
export class CardPreviewComponent {
  @Input() data!: CardData;
  @Output() export = new EventEmitter<void>();
  @ViewChild('cardElement') cardElement!: ElementRef;

  get enabledFilters(): FilterExposure[] {
    return this.data.filters.filter(f => f.enabled && f.frames > 0);
  }

  get totalIntegrationSeconds(): number {
    return calculateTotalIntegration(this.data.filters);
  }

  get totalIntegration(): string {
    return formatDuration(this.totalIntegrationSeconds);
  }

  getFilterDuration(filter: FilterExposure): string {
    return formatDuration(calculateTotalSeconds(filter));
  }

  getFilterProgress(filter: FilterExposure): number {
    const total = this.totalIntegrationSeconds;
    if (total === 0) return 0;
    return (calculateTotalSeconds(filter) / total) * 100;
  }

  get cardDimensions() {
    return ASPECT_RATIOS[this.data.aspectRatio];
  }

  get formattedDate(): string {
    if (!this.data.date) return '';
    const date = new Date(this.data.date);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  async exportCard() {
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const element = this.cardElement.nativeElement;
      const { width, height } = this.cardDimensions;
      
      // Get the actual computed style for width if it's auto/aspect-ratio based
      const actualWidth = element.offsetWidth;
      const actualHeight = element.offsetHeight;

      const canvas = await html2canvas(element, {
        width: actualWidth,
        height: actualHeight,
        scale: 2, // Higher quality
        backgroundColor: null,
        useCORS: true,
        logging: true, // Enable for debugging
        onclone: (doc) => {
          const el = doc.getElementById('card-preview');
          if (el) {
            el.style.transform = 'none';
          }
        }
      });
      
      // Download the image
      const filename = `astrocard-${this.data.title.replace(/\s+/g, '-').toLowerCase() || 'unnamed'}.png`;
      
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas toBlob failed');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.download = filename;
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 'image/png', 1.0); // Added quality param
    } catch (error) {
      console.error('Failed to export card:', error);
      alert('Failed to generate image. Please check the console for details.');
    }
  }
}
