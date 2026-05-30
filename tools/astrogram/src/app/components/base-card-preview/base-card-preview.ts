import { AnalyticsService, IconButtonComponent, IconComponent, downloadIcon } from '@db-astro-suite/ui';
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
import { EXPORT_DIMENSIONS_BY_RATIO } from '../../constants/preview-sizes.constants';
import type { AspectRatio } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { PreviewLayoutService } from '../../services/preview-layout.service';
import { resizeDataUrlToExactDimensions } from '../../utils/resize-data-url.util';

/** File extension + MIME info per exportable format. */
const EXPORT_FORMAT_MAP = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' as const },
  png: { ext: 'png', mime: 'image/png' as const },
  webp: { ext: 'webp', mime: 'image/webp' as const },
} as const;

/** Reduces a (w, h) pair to its lowest-terms aspect string using `_` as the separator (e.g. `4_5`, `9_16`). */
function aspectSlug(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height) || 1;
  return `${width / g}_${height / g}`;
}

/**
 * Filesystem-safe slug derived from a free-form name: lower-cases, replaces
 * any run of non `[a-z0-9]` characters with a single `-`, and trims leading
 * and trailing dashes. Returns the fallback when the result is empty.
 */
function nameSlug(raw: string, fallback: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

@Component({
  selector: 'dba-ag-base-card-preview',
  standalone: true,
  imports: [IconButtonComponent, IconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './base-card-preview.html',
  styleUrls: ['./base-card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseCardPreviewComponent implements OnInit, AfterViewInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private readonly cardDataService = inject(CardDataService);
  private readonly previewLayout = inject(PreviewLayoutService);


  aspectRatio = input<AspectRatio>('4:5');
  backgroundImage = input<string | null>(null);
  fillMode = input<'cover' | 'contain' | 'fill'>('cover');
  author = input<string>('astrophotographer');
  /** Human-readable basename for the export — typically the card title. */
  exportName = input<string>('astrogram');
  /** Differentiator inserted between the name and the aspect/resolution suffix (e.g. `info`, `stellar-map`). */
  exportTag = input<string>('astrogram');
  /** Disables the built-in Export button (still visible). Used when the host has nothing exportable yet. */
  disableDownload = input<boolean>(false);

  accentColor = input<string>('#ff2d95');
  accentColorRgb = input<string>('255, 45, 149');
  secondaryAccentColor = input<string>('#00E5FF');
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
    // Both 3:4 and 4:5 render at 480 px so the surrounding context bar +
    // caption section align flush with the card chrome on either side.
    return '480px';
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
    return `${480 * scale}px`;
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
  @HostBinding('style.--secondary-accent-color') get _secondaryAccentColor() {
    return this.secondaryAccentColor();
  }
  @HostBinding('style.--card-opacity') get _cardOpacity() {
    return this.cardOpacity();
  }

  @ViewChild('cardWrapper') cardWrapper!: ElementRef;
  @ViewChild('cardElement') cardElement!: ElementRef;
  @ViewChild('postContainer') postContainerRef!: ElementRef;

  /** Download glyph used by the export FAB. */
  protected readonly downloadIcon = downloadIcon;

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

    // Re-run scale calculation after the browser reflows for the new aspect-ratio class.
    effect(
      () => {
        this.aspectRatio(); // track input
        requestAnimationFrame(() => this.calculateScale());
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

    // Chrome-aware height budget so tall images (and tall infographic cards)
    // always fit on screen. Accounts for the top bar + mode-toggle row at the
    // top and a small breathing room at the bottom. The exporter ignores this
    // transform (it temporarily clears it in `exportCard`), so the downloaded
    // image is still rendered at the full target resolution from
    // `EXPORT_DIMENSIONS_BY_RATIO`.
    const viewportHeight = window.innerHeight;
    const headerHeight = 80;
    const footerPadding = 40;
    const maxAllowedHeight = (viewportHeight - headerHeight - footerPadding) * 0.95;

    // No horizontal buffer — stellar (auto) and infographic (fixed) preview
    // surfaces share the same available width so their final rendered card
    // widths stay consistent. The card itself clips overflow, so an image
    // can't bleed past the wrapper edges visually.
    const scaleW = wrapperRect.width / naturalWidth;
    const scaleH = maxAllowedHeight / naturalHeight;
    const scale = Math.min(scaleW, scaleH, 1);

    this.scaleFactor.set(scale);
    // Publish the displayed card width so sibling components (e.g. the
    // caption section) can match it instead of falling back to the static
    // 480 px design baseline.
    this.previewLayout.displayedCardWidth.set(naturalWidth * scale);
  }

  async exportCard(event?: MouseEvent) {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const format = this.cardDataService.exportFormat();
    const fmtInfo = EXPORT_FORMAT_MAP[format];

    try {
      // Track card export initiation
      this.analyticsService.trackCardExportInitiated(fmtInfo.ext);
      console.log('--- Export Start (Modern Screenshot) ---');
      const screenshot = await import('modern-screenshot');
      const element = this.cardElement.nativeElement;

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

      // For fixed-aspect presets we ship at the preset's pixel dimensions
      // (Instagram-ready 1080×*). For `auto` (stellar map) we ship at the
      // uploaded image's natural dimensions so the user gets back what
      // they put in, full resolution.
      const targetDim =
        this.aspectRatio() === 'auto'
          ? { width: this.naturalImageWidth(), height: this.naturalImageHeight() }
          : EXPORT_DIMENSIONS_BY_RATIO[this.aspectRatio()];
      const name = nameSlug(this.exportName(), 'astrogram');
      const tag = this.exportTag() || 'astrogram';
      const filename = `${name}_${tag}_${aspectSlug(targetDim.width, targetDim.height)}_${targetDim.width}_${targetDim.height}.${fmtInfo.ext}`;

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
        const opts = {
          scale: captureScale,
          quality: 0.95,
          backgroundColor: '#000000',
        };
        if (format === 'png') {
          dataUrl = await screenshot.domToPng(element, opts);
        } else if (format === 'webp') {
          dataUrl = await screenshot.domToWebp(element, opts);
        } else {
          dataUrl = await screenshot.domToJpeg(element, opts);
        }
        console.log('DOM ready for capture:', filename);
      } finally {
        if (postContainer) {
          postContainer.style.transform = originalTransform;
          postContainer.style.transformOrigin = originalTransformOrigin;
        }
      }

      // Lock the file to the exact target pixel dimensions. The DOM
      // capture can drift by 1 px on aspects whose 480 × (h/w) isn't an
      // integer (9:16, 1.91:1) or from raster sub-pixel rounding. For
      // `auto` mode the target is the uploaded image's natural size.
      if (targetDim.width > 0 && targetDim.height > 0) {
        dataUrl = await resizeDataUrlToExactDimensions(
          dataUrl,
          fmtInfo.mime,
          targetDim.width,
          targetDim.height,
        );
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
      
      // Track successful export
      const dataUrlSize = Math.ceil(dataUrl.length / 1024); // Convert to KB
      this.analyticsService.trackCardExportSuccess(fmtInfo.ext, dataUrlSize, 0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.analyticsService.trackCardExportFailed(errorMsg);
      console.error('Export failed:', error);
      alert('Failed to generate image. Please check the console.');
    } finally {
      this.isExporting.set(false);
      console.log('--- Export Process Ready ---');
    }
  }
}
