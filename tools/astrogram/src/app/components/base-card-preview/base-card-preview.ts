import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Injector,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'dba-ag-base-card-preview',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './base-card-preview.html',
  styleUrls: ['./base-card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseCardPreviewComponent implements OnInit, AfterViewInit, OnDestroy {
  aspectRatio = input<'3:4' | '4:5' | 'auto'>('4:5');
  backgroundImage = input<string | null>(null);
  fillMode = input<'cover' | 'contain' | 'fill'>('cover');
  author = input<string>('astrophotographer');
  exportFilename = input<string>('astrogram');

  accentColor = input<string>('#ff2d95');
  accentColorRgb = input<string>('255, 45, 149');
  cardOpacity = input<number>(0.85);

  @HostBinding('style.--scale-factor') get scale() {
    return this.scaleFactor();
  }
  @HostBinding('style.--scale-height') get scaleHeight() {
    return `${this.naturalHeightPx() * this.scaleFactor()}px`;
  }
  @HostBinding('style.--card-width') get cardWidth() {
    if (this.aspectRatio() === 'auto') {
      const natW = this.naturalImageWidth();
      if (natW > 0) return `${natW}px`;
      return this.backgroundImage() ? 'auto' : '480px';
    }
    return `${this.aspectRatio() === '3:4' ? 450 : 480}px`;
  }
  @HostBinding('style.--img-height') get imgHeight() {
    const natH = this.naturalImageHeight();
    return natH > 0 ? `${natH}px` : '600px';
  }
  @HostBinding('style.--header-width') get headerWidth() {
    const scale = this.scaleFactor();
    if (this.aspectRatio() === 'auto') {
      const natW = this.naturalImageWidth();
      if (natW > 0) return `${natW * scale}px`;
      return `${480 * scale}px`;
    }
    const baseW = this.aspectRatio() === '3:4' ? 450 : 480;
    return `${baseW * scale}px`;
  }
  @HostBinding('style.--post-width') get postWidth() {
    if (this.aspectRatio() === 'auto') {
      const natW = this.naturalImageWidth();
      if (natW > 0) return `${natW * this.scaleFactor()}px`;
      const baseWidth =
        this.backgroundImage() && this.cardElement
          ? this.cardElement.nativeElement.offsetWidth
          : 480;
      return `${baseWidth * this.scaleFactor()}px`;
    }
    return '100%';
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
  @ViewChild('postContainer') postContainerRef!: ElementRef;

  isExporting = signal(false);
  scaleFactor = signal(1);
  naturalHeightPx = signal(680);
  naturalImageWidth = signal(0);
  naturalImageHeight = signal(0);
  private resizeObserver: ResizeObserver | null = null;
  private injector = inject(Injector);

  @HostListener('window:resize')
  onResize() {
    this.calculateScale();
  }

  ngOnInit() {
    effect(
      () => {
        const img = this.backgroundImage();
        if (!img) {
          // Reset natural dimensions so the empty-state card uses its default size
          this.naturalImageWidth.set(0);
          this.naturalImageHeight.set(0);
          this.scaleFactor.set(1);
        }
      },
      { injector: this.injector },
    );
  }

  ngAfterViewInit() {
    this.setupResizeObserver();
    setTimeout(() => this.calculateScale(), 100);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  onImageLoad(evt: Event) {
    const img = evt.target as HTMLImageElement;
    this.naturalImageWidth.set(img.naturalWidth);
    this.naturalImageHeight.set(img.naturalHeight);
    setTimeout(() => this.calculateScale(), 50);
  }

  private setupResizeObserver() {
    if (!this.cardElement) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.calculateScale();
    });
    this.resizeObserver.observe(this.cardElement.nativeElement);
  }

  private calculateScale() {
    if (!this.cardWrapper || !this.cardElement) return;

    const wrapperElement = this.cardWrapper.nativeElement;
    const cardElement = this.cardElement.nativeElement;

    // Get the wrapper width (available space for the simulation panel)
    const wrapperRect = wrapperElement.getBoundingClientRect();
    if (wrapperRect.width === 0) return;

    // Measure the full post-container (header + card) at its natural (pre-transform) size.
    // In auto mode, use the known image natural dimensions for accurate scaling.
    let naturalHeight: number;
    let naturalWidth: number;

    if (this.aspectRatio() === 'auto' && this.naturalImageWidth() > 0) {
      naturalWidth = this.naturalImageWidth();
      naturalHeight = this.naturalImageHeight(); // Header is outside the scale container, not included
    } else {
      naturalHeight = this.postContainerRef?.nativeElement.offsetHeight ?? 680;
      naturalWidth = cardElement.offsetWidth;
    }
    this.naturalHeightPx.set(naturalHeight);

    // Scaling strategy differs by mode
    let scale = 1;

    // Use window height for better accuracy as the parent .main-container may have padding/margins
    const viewportHeight = window.innerHeight;
    const headerHeight = 80; // Adjusted for actual header height
    const footerPadding = 40; // Small bottom margin
    const maxAllowedHeight = (viewportHeight - headerHeight - footerPadding) * 0.95;

    if (this.aspectRatio() === 'auto') {
      // PROPORTIONAL SCALING: Maximize size based on both width AND height constraints
      const scaleW = (wrapperRect.width - 40) / naturalWidth; // 40px buffer for horizontal margins
      const scaleH = maxAllowedHeight / naturalHeight;

      // In Auto mode (Stellar Map), we prioritize filling the available screen height (95%)
      // This ensures 16:10 or landscape images don't look small.
      scale = Math.min(scaleW, scaleH);
    } else {
      // INFOGRAPHIC SCALING: Fixed width priority, scale down if width is too small
      scale = wrapperRect.width < naturalWidth ? wrapperRect.width / naturalWidth : 1;

      // Safety clamp for vertical overflow in infographic mode too
      if (naturalHeight * scale > maxAllowedHeight) {
        scale = maxAllowedHeight / naturalHeight;
      }
    }

    this.scaleFactor.set(scale);
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
