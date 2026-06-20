import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  IconButtonComponent,
  SplitButtonComponent,
  TextButtonComponent,
} from '@db-astro-suite/ui';
import { profileDisplayUrl } from '../../models/app.constants';
import { SessionStore } from '../../services/session-store.service';
import { slugifyHandle } from '../../utils/handle.util';
import type { CelestoryStory } from '../../models/story.model';
import { DOWNLOAD_FORMAT_MENU, STORY_TYPES } from '../../models/share.constants';
import type {
  ShareAssetKind,
  ShareFormatId,
  ShareMode,
  ShareThemeId,
} from '../../models/share.types';
import {
  CAROUSEL_SLIDE_COUNT,
  ensureShareFonts,
  renderCarouselSlide,
  renderShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
} from '../../utils/share-card.util';
import { buildShareModel, scopeModelByYear } from '../../utils/share-model.util';
import { copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { SUGGESTED_DESTINATIONS } from '../../models/share.constants';
import type { JourneyState } from '../../models/journey.types';

/**
 * Share Studio — two-panel modal. Left panel shows a live canvas preview.
 * Right panel has a story type picker, timeframe filter, design theme,
 * format selector, and download (PNG/JPEG) + share actions. Fully client-side.
 */
@Component({
  selector: 'dba-share-studio-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, SplitButtonComponent],
  templateUrl: './share-studio-modal.component.html',
  styleUrl: './share-studio-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareStudioModalComponent {
  /** The story to render. */
  readonly story = input.required<CelestoryStory>();
  /** The public handle (for the card's URL line). */
  readonly handle = input<string>('');
  /** Journey state — gates the published social row / private publish CTA. */
  readonly state = input<JourneyState>('preview');

  /** Emits when the modal should close. */
  readonly closed = output<void>();
  /** Emits to open the Publish flow (from the private-state CTA). */
  readonly openPublish = output<void>();

  /** Social destinations suggested after publishing. */
  protected readonly destinations = SUGGESTED_DESTINATIONS;
  /** True once the journey is published (shows the share-link row). */
  protected readonly isPublished = computed(() => this.state() === 'published');
  /** True while the journey is a private preview (shows the publish CTA). */
  protected readonly isPrivate = computed(() => this.state() === 'preview');

  /** Canvas the card is painted onto. */
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  /** Picker options exposed to the template. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST;
  protected readonly storyTypes = STORY_TYPES;

  /** Top-level asset kind tab (Summary Card / Story Slides / Poster). */
  protected readonly kind = signal<ShareAssetKind>('summary');
  /** Current selections. */
  protected readonly themeId = signal<ShareThemeId>('dark');
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly storyType = signal('summary');
  protected readonly yearFilter = signal('all-time');
  protected readonly dlFormat = signal<'png' | 'jpeg'>('png');
  /** Download-format menu for the split button. */
  protected readonly downloadMenu = DOWNLOAD_FORMAT_MENU;
  /** Single card vs the multi-slide carousel. */
  protected readonly mode = signal<ShareMode>('single');
  /** Current carousel slide (0-based). */
  protected readonly slideIndex = signal(0);
  /** Total carousel slides. */
  protected readonly slideCount = CAROUSEL_SLIDE_COUNT;
  /** Slide indices for the pager dots. */
  protected readonly slides = Array.from({ length: CAROUSEL_SLIDE_COUNT }, (_, i) => i);
  /** Transient flash message ("Downloaded", etc.). */
  protected readonly flash = signal('');

  /** Years derived from the summary activity log, descending. */
  protected readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const a of this.story().summary.activity ?? []) {
      const y = parseInt(a.date.slice(0, 4), 10);
      if (!isNaN(y)) {
        years.add(y);
      }
    }
    return [...years].sort((a, b) => b - a);
  });

  /** The currently selected story type object. */
  protected readonly selectedStory = computed(
    () => STORY_TYPES.find((t) => t.id === this.storyType()) ?? STORY_TYPES[0],
  );

  /** Pixel dimensions of the current format. */
  protected readonly currentFormatDims = computed(() => {
    const fmt = SHARE_FORMATS[this.formatId()];
    return `${fmt.w} × ${fmt.h}px`;
  });

  /** Editable identity (name/handle), shared live with the portfolio hero. */
  protected readonly session = inject(SessionStore);
  /** Handle printed on the card: the edited identity wins, else the input. */
  private readonly effectiveHandle = computed(() => this.session.identity().handle || this.handle());
  /** Canonical profile URL shown in the left-panel claim bar (with a placeholder). */
  protected readonly claimUrl = computed(() =>
    profileDisplayUrl(this.effectiveHandle() || 'yourhandle'),
  );
  /** Year scope from the timeframe pills ('all' or a calendar year). */
  private readonly yearScope = computed<number | 'all'>(() => {
    const y = this.yearFilter();
    return y === 'all-time' ? 'all' : Number(y);
  });
  /** Render-ready model, scoped to the chosen timeframe, with the edited identity. */
  protected readonly model = computed(() => {
    const ident = this.session.identity();
    const base = buildShareModel(this.story(), { name: ident.name, handle: this.effectiveHandle() });
    return scopeModelByYear(base, this.yearScope());
  });

  /** Update the shared identity from the studio's name input. */
  setIdentityName(value: string): void {
    this.session.setIdentity({ ...this.session.identity(), name: value });
  }
  /** Update the shared identity from the studio's handle input. */
  setIdentityHandle(value: string): void {
    this.session.setIdentity({ ...this.session.identity(), handle: slugifyHandle(value) });
  }

  /** Cached font-readiness so we only await once. */
  private fontsReady: Promise<void> | null = null;

  /** Re-paint whenever canvas, mode, theme, format, slide or model changes. */
  private readonly repaint = effect(() => {
    const canvas = this.canvasRef()?.nativeElement;
    const mode = this.mode();
    const themeId = this.themeId();
    const formatId = this.formatId();
    const model = this.model();
    if (!canvas) {
      return;
    }
    this.fontsReady ??= ensureShareFonts();
    if (mode === 'single') {
      const variant = this.storyType();
      void this.fontsReady.then(() => renderShareCard(canvas, model, themeId, formatId, variant));
    } else {
      const index = this.slideIndex();
      void this.fontsReady.then(() => renderCarouselSlide(canvas, model, themeId, index, formatId));
    }
  });

  /**
   * Selects the top-level asset kind, applying sensible mode/format defaults:
   * Summary Card → single summary, Story Slides → carousel, Poster → wide single.
   */
  selectKind(kind: ShareAssetKind): void {
    this.kind.set(kind);
    if (kind === 'slides') {
      this.mode.set('carousel');
      if (this.formatId() === 'landscape') {
        this.formatId.set('story');
      }
      return;
    }
    this.mode.set('single');
    if (kind === 'poster') {
      this.formatId.set('landscape');
    } else if (this.formatId() === 'landscape') {
      this.formatId.set('story');
    }
  }

  /** Selects a story type. */
  selectStoryType(id: string): void {
    this.storyType.set(id);
  }

  /** Selects a year filter. */
  selectYear(y: string): void {
    this.yearFilter.set(y);
  }

  /** Selects a colour palette (theme). */
  selectTheme(id: ShareThemeId): void {
    this.themeId.set(id);
  }

  /** Story-type dropdown change. */
  onStoryType(event: Event): void {
    this.storyType.set((event.target as HTMLSelectElement).value);
  }

  /** Selects a format. */
  selectFormat(id: ShareFormatId): void {
    this.formatId.set(id);
  }

  /** Switches the active download format (from the split-button menu). */
  setDlFormat(f: string): void {
    this.dlFormat.set(f === 'jpeg' ? 'jpeg' : 'png');
  }

  /** Switches between single-card and carousel. */
  setMode(mode: ShareMode): void {
    this.mode.set(mode);
  }

  /** Advances the carousel. */
  nextSlide(): void {
    this.slideIndex.update((i) => Math.min(this.slideCount - 1, i + 1));
  }

  /** Goes back a slide. */
  prevSlide(): void {
    this.slideIndex.update((i) => Math.max(0, i - 1));
  }

  /** Jumps to a specific slide. */
  goSlide(i: number): void {
    this.slideIndex.set(i);
  }

  /** Downloads the current card as PNG or JPEG. */
  downloadAs(format: 'png' | 'jpeg'): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `celestory-${this.themeId()}-${this.formatId()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.flashMessage('Downloaded');
      },
      mime,
      format === 'jpeg' ? 0.92 : undefined,
    );
  }

  /** Downloads every carousel slide as sequential PNGs. */
  async downloadAll(): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    try {
      await (this.fontsReady ??= ensureShareFonts());
      const themeId = this.themeId();
      const formatId = this.formatId();
      const model = this.model();
      for (let i = 0; i < this.slideCount; i++) {
        renderCarouselSlide(canvas, model, themeId, i, formatId);
        await new Promise<void>((res) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `celestory-${themeId}-${formatId}-slide${i + 1}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
            res();
          }, 'image/png');
        });
        await new Promise((r) => setTimeout(r, 350));
      }
      renderCarouselSlide(canvas, model, themeId, this.slideIndex(), formatId);
      this.flashMessage('Downloaded all');
    } catch {
      this.flashMessage('Download failed');
    }
  }

  /** Shares the card via the Web Share API, falling back to download. */
  share(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void shareCanvas(canvas, 'celestory.png').then((shared) => {
      if (!shared) {
        this.downloadAs('png');
      }
    });
  }

  /** Copies the card to the clipboard, falling back to download. */
  copy(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void copyCanvasToClipboard(canvas).then((ok) => {
      if (ok) {
        this.flashMessage('Copied');
      } else {
        this.downloadAs('png');
      }
    });
  }

  /** Opens a social destination's share intent in a new tab. */
  openDestination(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    }
  }

  /** Closes when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  private flashMessage(msg: string): void {
    this.flash.set(msg);
    setTimeout(() => {
      if (this.flash() === msg) {
        this.flash.set('');
      }
    }, 1400);
  }
}
