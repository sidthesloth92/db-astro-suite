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
  
  isExporting = signal(false);
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
    if (this.isExporting()) return;
    this.isExporting.set(true);

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
      
      // The card element's natural dimensions (unaffected by CSS transform on parent)
      const naturalWidth = element.offsetWidth;
      const naturalHeight = element.offsetHeight;
      
      // Calculate scale to reach target resolution (e.g. 1080px wide)
      const captureScale = targetDim.width / naturalWidth;
      
      console.log(`Natural size: ${naturalWidth}x${naturalHeight}, target: ${targetDim.width}x${targetDim.height}, scale: ${captureScale.toFixed(2)}`);

      // On mobile, the parent post-container has a CSS scale() transform applied.
      // modern-screenshot clips to the visible (scaled-down) area, cropping the output.
      // We temporarily reset the transform to capture the card at its true layout size.
      const postContainer = element.closest('.post-container') as HTMLElement | null;
      const originalTransform = postContainer?.style.transform ?? '';
      const originalTransformOrigin = postContainer?.style.transformOrigin ?? '';
      if (postContainer) {
        postContainer.style.transform = 'none';
        postContainer.style.transformOrigin = 'unset';
        // Force a reflow so the new layout is applied before capture
        postContainer.getBoundingClientRect();
      }

      let dataUrl: string;
      try {
        dataUrl = await domToJpeg(element, {
          scale: captureScale,
          quality: 0.95,
          backgroundColor: '#000000'
        });
      } finally {
        // Always restore the transform, even if capture fails
        if (postContainer) {
          postContainer.style.transform = originalTransform;
          postContainer.style.transformOrigin = originalTransformOrigin;
        }
      }
      
      console.log('Image generated. Triggering download...');
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUrl;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      // Separate cleanup from UI state reset
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 500);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate image. Please check the console.');
    } finally {
      this.isExporting.set(false);
      console.log('--- Export Process Ready ---');
    }
  }
}
