import { AnalyticsService, IconButtonComponent, IconComponent, downloadIcon } from '@db-astro-suite/ui';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
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
  viewChild,
} from '@angular/core';
import { EXPORT_DIMENSIONS_BY_RATIO } from '../../constants/preview-sizes.constants';
import { THEME_DESIGN_HEIGHT, THEME_DESIGN_WIDTH } from '../../constants/theme-canvas.constants';
import type { AspectRatio } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { PreviewLayoutService } from '../../services/preview-layout.service';
import { resizeDataUrlToExactDimensions } from '../../utils/resize-data-url.util';
import { computeThemeCanvas } from '../../utils/theme-canvas.util';
import {
  CONTENT_FIT_MAX_PASSES,
  CONTENT_FIT_TOLERANCE,
  MAX_CONTENT_FIT_FACTOR,
  measureTextOverflow,
} from '../../utils/theme-fit.util';

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
  /**
   * CSS `transform` applied to the zoomable card layers (background image +
   * full-bleed overlay), e.g. `translate(-20%, 10%) scale(2.5)`. Empty string
   * (the default) leaves the card untransformed, so non-stellar consumers are
   * unaffected. Always neutralized during export so downloads ship the full,
   * un-zoomed frame — see `appliedContentTransform`.
   */
  contentTransform = input<string>('');

  accentColor = input<string>('#ff2d95');
  accentColorRgb = input<string>('255, 45, 149');
  secondaryAccentColor = input<string>('#00E5FF');
  cardOpacity = input<number>(0.85);
  /**
   * When true, the projected content fills the card edge-to-edge (no inner
   * padding / flex distribution). Card themes draw their own full-bleed
   * background + padding, so they opt into this; the stellar-map and legacy
   * layouts keep the default padded flex column.
   */
  bleedContent = input<boolean>(false);
  /**
   * Width of the design artboard the projected theme was authored against.
   * Only meaningful in `bleedContent` mode — see `computeThemeCanvas`.
   */
  themeBasisWidth = input<number>(THEME_DESIGN_WIDTH);
  /** Height of the design artboard the projected theme was authored against. */
  themeBasisHeight = input<number>(THEME_DESIGN_HEIGHT);

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
    // Card themes are authored on a 540 px basis (the design source canvas),
    // so bleed (themed) cards render at 540 px for pixel-faithful proportions;
    // the preview scales the card to fit and the export still targets 1080 px.
    // Legacy / stellar consumers keep the historical 480 px chrome width.
    return this.bleedContent() ? '540px' : '480px';
  }
  /** Base card width (px) used for header/post sizing math. */
  private get baseWidth(): number {
    return this.bleedContent() ? 540 : 480;
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
    return `${this.baseWidth * scale}px`;
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
  /**
   * Transform actually bound to the zoomable layers. Forced to `none` while an
   * export is in flight so `modern-screenshot` captures the card at zoom 1 —
   * the user always gets back the full-resolution, fully-framed image.
   */
  readonly appliedContentTransform = computed(() =>
    this.isExporting() ? 'none' : this.contentTransform(),
  );
  scaleFactor = signal(1);
  naturalHeightPx = signal(680);
  naturalImageWidth = signal(0);
  naturalImageHeight = signal(0);

  /** Card's measured layout width (pre-transform), published by `calculateScale`. */
  private readonly cardLayoutWidth = signal(0);

  /**
   * Card's exact width / height ratio. Taken from the preset's canonical
   * export dimensions rather than a rounded DOM measurement so the theme
   * canvas is deterministic; `auto` falls back to the source image.
   */
  private readonly cardAspectValue = computed(() => {
    const ratio = this.aspectRatio();
    if (ratio === 'auto') {
      const width = this.naturalImageWidth();
      const height = this.naturalImageHeight();
      return width > 0 && height > 0
        ? width / height
        : this.themeBasisWidth() / this.themeBasisHeight();
    }
    const dimensions = EXPORT_DIMENSIONS_BY_RATIO[ratio];
    return dimensions.width / dimensions.height;
  });

  /**
   * Layout canvas the projected theme renders into, plus the uniform scale
   * that maps it onto the card. Guarantees the theme always gets at least
   * its authored artboard room on both axes, so short aspects (1:1) no
   * longer clip the tail of the content.
   */
  readonly themeCanvas = computed(() => {
    const fit = this.contentFitFactor();
    return computeThemeCanvas(this.cardLayoutWidth(), this.cardAspectValue(), {
      width: this.themeBasisWidth() * fit,
      height: this.themeBasisHeight() * fit,
    });
  });

  /**
   * How much the theme canvas is grown beyond its artboard so the user's text
   * fits (1 = not at all). Themes are designed around typical data; a long
   * object name, seven filters or extra gear rows can need more room than the
   * artboard has, and without this the tail of the card was clipped off. A
   * larger canvas is scaled down onto the same card, so the whole design
   * shrinks slightly instead of losing content.
   */
  private readonly contentFitFactor = signal(1);

  /** The theme canvas element, measured to fit content. */
  private readonly themeCanvasRef = viewChild<ElementRef<HTMLElement>>('themeCanvasEl');

  /** Watches the projected theme for re-renders that can change its height. */
  private contentObserver: MutationObserver | null = null;

  /** Pending animation frame for a coalesced content-fit pass, if any. */
  private contentFitFrame = 0;

  /** `transform` applied to the theme canvas, or `null` outside bleed mode. */
  readonly themeCanvasTransform = computed(() =>
    this.bleedContent() ? `scale(${this.themeCanvas().scale})` : null,
  );
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
    this.setupContentFit();
    setTimeout(() => this.calculateScale(), 100);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.contentObserver?.disconnect();
    cancelAnimationFrame(this.contentFitFrame);
    document.fonts.removeEventListener('loadingdone', this.onFontsLoaded);
  }

  onImageLoad(evt: Event) {
    const img = evt.target as HTMLImageElement;
    this.naturalImageWidth.set(img.naturalWidth);
    this.naturalImageHeight.set(img.naturalHeight);
    setTimeout(() => this.calculateScale(), 50);
  }

  /** Re-fits the theme whenever its content, the canvas size or the fonts change. */
  private setupContentFit(): void {
    const canvas = this.themeCanvasRef()?.nativeElement;
    if (!canvas || !this.bleedContent()) return;

    this.contentObserver = new MutationObserver((mutations) => {
      // The fit pass writes the canvas's own size; only changes inside the
      // theme are a reason to measure again.
      if (mutations.some((m) => m.target !== canvas)) this.scheduleContentFit();
    });
    this.contentObserver.observe(canvas, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    document.fonts.addEventListener('loadingdone', this.onFontsLoaded);

    // Format and artboard changes resize the canvas without touching the theme.
    effect(
      () => {
        this.cardLayoutWidth();
        this.cardAspectValue();
        this.themeBasisWidth();
        this.themeBasisHeight();
        this.scheduleContentFit();
      },
      { injector: this.injector },
    );
  }

  /** Web fonts landing late reflow text, so the fit is measured again. */
  private readonly onFontsLoaded = (): void => this.scheduleContentFit();

  /** Coalesces fit requests into one pass on the next animation frame. */
  private scheduleContentFit(): void {
    if (this.contentFitFrame) return;
    this.contentFitFrame = requestAnimationFrame(() => {
      this.contentFitFrame = 0;
      this.fitThemeToContent();
    });
  }

  /**
   * Grows the theme canvas just enough that none of the user's text is cut
   * off, and no further.
   *
   * Runs synchronously: the canvas is reset to its artboard, measured, and
   * enlarged in steps within one task, so the preview never paints an
   * intermediate size. Each step grows by the measured shortfall; when a step
   * stops helping (content inside a fixed-height box) the best factor found
   * is kept rather than shrinking the card for nothing.
   */
  private fitThemeToContent(): void {
    const canvas = this.themeCanvasRef()?.nativeElement;
    const root = canvas?.firstElementChild?.firstElementChild;
    if (!canvas || !(root instanceof HTMLElement) || !this.bleedContent()) return;

    // Sized exactly as the `themeCanvas` binding will size it, whole pixels
    // included, so the measured layout is the one that renders.
    const applyFactor = (factor: number): void => {
      const sized = computeThemeCanvas(this.cardLayoutWidth(), this.cardAspectValue(), {
        width: this.themeBasisWidth() * factor,
        height: this.themeBasisHeight() * factor,
      });
      canvas.style.width = `${sized.width}px`;
      canvas.style.height = `${sized.height}px`;
    };

    let factor = 1;
    applyFactor(factor);
    let overflow = measureTextOverflow(root);
    let best = { factor, overflow };

    for (let pass = 0; pass < CONTENT_FIT_MAX_PASSES && overflow > CONTENT_FIT_TOLERANCE; pass++) {
      const next = Math.min(MAX_CONTENT_FIT_FACTOR, factor * overflow * 1.01);
      if (next <= factor) break;
      factor = next;
      applyFactor(factor);
      overflow = measureTextOverflow(root);
      if (overflow < best.overflow - 0.005) best = { factor, overflow };
      else if (overflow >= best.overflow) break;
    }

    applyFactor(best.factor);
    this.contentFitFactor.set(best.factor);
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

    // Publish the card's own layout width (unaffected by the post-container's
    // scale transform) so the theme canvas can size itself against it.
    this.cardLayoutWidth.set(cardElement.offsetWidth);

    // Measure the full post-container (header + card) at its natural (pre-transform) size.
    // In auto mode, use the known image natural dimensions for accurate scaling.
    let naturalHeight: number;
    let naturalWidth: number;

    if (this.aspectRatio() === 'auto' && this.naturalImageWidth() > 0) {
      naturalWidth = this.naturalImageWidth();
      naturalHeight = this.naturalImageHeight(); // Header is outside the scale container, not included
    } else {
      naturalHeight = this.postContainerRef?.nativeElement.offsetHeight ?? 680;
      // Measure the box the transform actually scales — the post-container's
      // border-box — not the card inside it. The card is 2px narrower (the
      // container's 1px side borders), so dividing by it made `scaleFactor`
      // 540/538 too large: the scaled container came out ~1.8px wider than
      // the wrapper while `.post-header` was clamped to it by `max-width`,
      // leaving the card visibly overhanging the header on both edges.
      naturalWidth = this.postContainerRef?.nativeElement.offsetWidth ?? cardElement.offsetWidth;
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

      // The card element's natural dimensions (unaffected by CSS transform on
      // parent), floored to whole CSS pixels. The card's height is usually
      // fractional (538 wide at 3:4 is 717.33 tall); captured at that size,
      // the rendered image rounded up to 718 and left its last export row
      // almost black. Clipping the sub-pixel sliver instead costs nothing
      // visible, and the resize below stretches the capture to the target.
      const cardStyle = getComputedStyle(element);
      const naturalWidth = Math.floor(parseFloat(cardStyle.width)) || element.offsetWidth;
      const naturalHeight = Math.floor(parseFloat(cardStyle.height)) || element.offsetHeight;

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
          width: naturalWidth,
          height: naturalHeight,
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
