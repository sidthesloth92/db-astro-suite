import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { profileDisplayUrl } from '../../models/app.constants';
import type { CelestoryLedger, LedgerObject } from '../../models/ledger.model';
import type { ObjectShareData, ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  buildObjectShareData,
  ensureShareFonts,
  renderObjectShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
  THEME_MOTIF,
} from '../../utils/share-card.util';
import { copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Per-object Share — a live canvas studio scoped to ONE target. Pick a theme,
 * background motif and format, then download the card. Fully client-side.
 */
@Component({
  selector: 'dba-object-share-modal',
  standalone: true,
  imports: [CelIconComponent],
  templateUrl: './object-share-modal.component.html',
  styleUrl: './object-share-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class ObjectShareModalComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The object to render. */
  readonly obj = input.required<LedgerObject>();
  /** The full ledger (resolves equipment names). */
  readonly ledger = input.required<CelestoryLedger>();
  /** Public handle for the card's URL line. */
  readonly handle = input<string>('');
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  /** Picker options. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST;

  /** Selections. */
  protected readonly themeId = signal<ShareThemeId>('astro');
  /** The motif painted for the selected theme (theme-driven, not a separate axis). */
  protected readonly backgroundId = computed(() => THEME_MOTIF[this.themeId()]);
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly flash = signal('');

  /** URL line for the card. */
  private readonly displayUrl = computed(() => profileDisplayUrl(this.handle()));
  /** The object card data. */
  protected readonly data = computed<ObjectShareData>(() =>
    buildObjectShareData(this.obj(), this.ledger(), this.displayUrl()),
  );
  /** Aspect-ratio style for the preview frame. */
  protected readonly aspect = computed(() => {
    const f = SHARE_FORMATS[this.formatId()];
    return `${f.w} / ${f.h}`;
  });

  private fontsReady: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const themeId = this.themeId();
      const backgroundId = this.backgroundId();
      const formatId = this.formatId();
      const data = this.data();
      if (!this.isBrowser || !canvas) {
        return;
      }
      this.fontsReady ??= ensureShareFonts();
      void this.fontsReady.then(() => renderObjectShareCard(canvas, themeId, backgroundId, formatId, data));
    });
  }

  /** Set the colour theme. */
  selectTheme(id: ShareThemeId): void {
    this.themeId.set(id);
  }
  /** Set the format. */
  selectFormat(id: ShareFormatId): void {
    this.formatId.set(id);
  }

  /** Filename stem for this object's card. */
  private fileStem(): string {
    return `${(this.obj().designation || this.obj().displayName).replace(/\s+/g, '-').toLowerCase()}-celestory`;
  }

  /** Download the current card as a PNG. */
  download(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.fileStem()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      this.flashMessage('Downloaded');
    }, 'image/png');
  }

  /** Copy the current card to the clipboard (falls back to download). */
  copy(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void copyCanvasToClipboard(canvas).then((ok) => {
      if (ok) {
        this.flashMessage('Copied');
      } else {
        this.download();
      }
    });
  }

  /** Share the current card via the Web Share API (falls back to download). */
  share(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void shareCanvas(canvas, `${this.fileStem()}.png`).then((shared) => {
      if (!shared) {
        this.download();
      }
    });
  }

  private flashMessage(msg: string): void {
    this.flash.set(msg);
    setTimeout(() => {
      if (this.flash() === msg) {
        this.flash.set('');
      }
    }, 1400);
  }

  /** Close when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
