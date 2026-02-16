import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './card-preview.html',
  styleUrl: './card-preview.css'
})
export class CardPreviewComponent {
  @Input() data!: CardData;
  @Output() export = new EventEmitter<void>();
  @ViewChild('cardElement') cardElement!: ElementRef;
  isExporting = false;

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

  async exportCard(event?: MouseEvent) {
    if (this.isExporting) return;
    this.isExporting = true;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      console.log('--- Export Start (Modern Screenshot) ---');
      const { domToJpeg } = await import('modern-screenshot');
      const element = this.cardElement.nativeElement;
      
      const sanitizedTitle = this.data.title
        .trim()
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
      
      const filename = `${sanitizedTitle || 'astrogram'}.jpg`;

      // Wait for fonts and all images to be truly ready
      await document.fonts.ready;
      const images = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      console.log('DOM ready for capture:', filename);

      const dataUrl = await domToJpeg(element, {
        quality: 0.95,
        scale: 2,
        backgroundColor: '#000000'
      });
      
      console.log('Image generated. Triggering download...');
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUrl;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      // Short delay and reset
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        this.isExporting = false;
        console.log('--- Export Complete ---');
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate image. Please check the console.');
      this.isExporting = false;
    }
  }
}
