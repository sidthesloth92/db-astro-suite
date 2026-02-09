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
      console.log('--- Export Start ---');
      console.log('User Agent:', navigator.userAgent);
      
      const html2canvas = (await import('html2canvas')).default;
      const element = this.cardElement.nativeElement;
      
      const sanitizedTitle = this.data.title
        .trim()
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
      
      const filename = `${sanitizedTitle || 'astrocard'}.jpg`;
      const actualWidth = element.offsetWidth;
      const actualHeight = element.offsetHeight;

      console.log('Capturing:', filename, { actualWidth, actualHeight });

      const canvas = await html2canvas(element, {
        width: actualWidth,
        height: actualHeight,
        scale: 2,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: true,
        onclone: (doc) => {
          const el = doc.getElementById('card-preview');
          if (el) {
            el.style.transform = 'none';
          }
        }
      });
      
      console.log('Canvas generated. Creating file blob...');
      
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Blob generation failed');
          this.isExporting = false;
          return;
        }

        // Using File constructor can help Safari/Chrome associate the name better
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const url = URL.createObjectURL(file);
        
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        
        // Reliability for some browsers
        link.target = '_blank';
        
        document.body.appendChild(link);
        console.log('Triggering download for:', filename);
        link.click();
        
        // Maintain the URL for 10 seconds to ensure the browser has time to "start" the save dialog
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
          this.isExporting = false;
          console.log('--- Export Complete ---');
        }, 10000);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate image. Please check the console.');
      this.isExporting = false;
    }
  }
}
