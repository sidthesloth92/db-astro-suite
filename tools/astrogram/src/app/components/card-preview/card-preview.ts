import { Component, ElementRef, ViewChild, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA, signal, HostListener, AfterViewInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
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
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'dba-ag-card-preview',
  standalone: true,
  imports: [CommonModule, FilterRingComponent, BortleScaleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './card-preview.html',
  styleUrls: ['./card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardPreviewComponent implements AfterViewInit {
  private dataService = inject(CardDataService);
  cardData = this.dataService.cardData;

  @Output() export = new EventEmitter<void>();
  
  @ViewChild('cardWrapper') cardWrapper!: ElementRef;
  @ViewChild('cardElement') cardElement!: ElementRef;
  
  isExporting = false;
  scaleFactor = signal(1);

  @HostListener('window:resize')
  onResize() {
    this.calculateScale();
  }

  ngAfterViewInit() {
    setTimeout(() => this.calculateScale(), 100);
  }

  private calculateScale() {
    if (!this.cardWrapper || !this.cardElement) return;
    
    const containerWidth = this.cardWrapper.nativeElement.offsetWidth;
    const originalWidth = this.cardElement.nativeElement.offsetWidth;
    
    if (containerWidth < originalWidth) {
      this.scaleFactor.set(containerWidth / originalWidth);
    } else {
      this.scaleFactor.set(1);
    }
  }

  enabledFilters = computed(() => this.cardData().filters.filter(f => f.enabled && f.frames > 0));

  totalIntegrationSeconds = computed(() => calculateTotalIntegration(this.cardData().filters));

  totalIntegration = computed(() => formatDuration(this.totalIntegrationSeconds()));

  getFilterDuration(filter: FilterExposure): string {
    return formatDuration(calculateTotalSeconds(filter));
  }

  getFilterProgress(filter: FilterExposure): number {
    const total = this.totalIntegrationSeconds();
    if (total === 0) return 0;
    return (calculateTotalSeconds(filter) / total) * 100;
  }

  cardDimensions = computed(() => ASPECT_RATIOS[this.cardData().aspectRatio]);

  formattedDate = computed(() => {
    const dateStr = this.cardData().date;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  });

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
      
      const sanitizedTitle = this.cardData().title
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

      const targetDim = this.cardDimensions();
      const currentWidth = element.offsetWidth || 1;
      
      // Calculate scale factor needed to reach our target (1080px)
      // This works even on mobile where currentWidth might be smaller (e.g. 320px)
      const captureScale = targetDim.width / currentWidth;
      
      console.log(`Exporting: ${targetDim.width}x${targetDim.height} (Scale: ${captureScale.toFixed(2)})`);

      // Final readiness check
      await document.fonts.ready;
      
      const dataUrl = await domToJpeg(element, {
        scale: captureScale,
        quality: 0.95,
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
