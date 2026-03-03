import {
  Component,
  ElementRef,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  HostListener,
  AfterViewInit,
  ChangeDetectionStrategy,
  HostBinding,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dba-ag-base-card-preview',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './base-card-preview.html',
  styleUrls: ['./base-card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseCardPreviewComponent implements AfterViewInit {
  aspectRatio = input<'3:4' | '4:5'>('4:5');
  backgroundImage = input<string | null>(null);
  author = input<string>('astrophotographer');
  exportFilename = input<string>('astrogram');

  accentColor = input<string>('#ff2d95');
  accentColorRgb = input<string>('255, 45, 149');
  cardOpacity = input<number>(0.85);

  @HostBinding('style.--scale-factor') get scale() {
    return this.scaleFactor();
  }
  @HostBinding('style.--scale-height.px') get scaleHeight() {
    return 680 * this.scaleFactor();
  }
  @HostBinding('style.--card-width.px') get cardWidth() {
    return this.aspectRatio() === '3:4' ? 450 : 480;
  }
  @HostBinding('style.--accent-color') get _accentColor() {
    return this.accentColor();
  }
  @HostBinding('style.--accent-color-rgb') get _accentColorRgb() {
    return this.accentColorRgb();
  }
  @HostBinding('style.--card-opacity') get _cardOpacity() {
    return this.cardOpacity();
  }

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

      const filename = `${this.exportFilename() || 'astrogram'}.jpg`;

      // Wait for fonts and all images to be truly ready
      await document.fonts.ready;
      const images = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }),
      );

      console.log('DOM ready for capture:', filename);

      const targetDim =
        this.aspectRatio() === '3:4'
          ? { width: 1080, height: 1440 }
          : { width: 1080, height: 1350 };

      // The card element's natural dimensions (unaffected by CSS transform on parent)
      const naturalWidth = element.offsetWidth;
      const naturalHeight = element.offsetHeight;

      // Calculate scale to reach target resolution (e.g. 1080px wide)
      const captureScale = targetDim.width / naturalWidth;

      console.log(
        `Natural size: ${naturalWidth}x${naturalHeight}, target: ${targetDim.width}x${targetDim.height}, scale: ${captureScale.toFixed(2)}`,
      );

      // On mobile, the parent post-container has a CSS scale() transform applied.
      const postContainer = element.closest('.post-container') as HTMLElement | null;
      const originalTransform = postContainer?.style.transform ?? '';
      const originalTransformOrigin = postContainer?.style.transformOrigin ?? '';
      if (postContainer) {
        postContainer.style.transform = 'none';
        postContainer.style.transformOrigin = 'unset';
        postContainer.getBoundingClientRect();
      }

      let dataUrl: string;
      try {
        dataUrl = await domToJpeg(element, {
          scale: captureScale,
          quality: 0.95,
          backgroundColor: '#000000',
        });
      } finally {
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
