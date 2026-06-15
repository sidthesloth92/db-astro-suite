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
import type { CelestoryLedger, LedgerObject } from '../../models/ledger.model';
import type { ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  ensureShareFonts,
  renderObjectShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
} from '../../utils/share-card.util';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { buildShareModel } from '../../utils/share-model.util';
import { SessionStore } from '../../services/session-store.service';
import { copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Per-object Share — a live canvas studio scoped to ONE target. Pick a theme,
 * background motif and format, then download the card. Fully client-side.
 */
@Component({
  selector: 'dba-object-share-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, CelIconComponent],
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

  /** Shared session identity (name / handle) printed on the card. */
  private readonly session = inject(SessionStore);

  /** Picker options. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST;

  /** Selections. */
  protected readonly themeId = signal<ShareThemeId>('astro');
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly flash = signal('');

  /** Render-ready model, with the edited identity (handle falls back to the input). */
  private readonly model = computed(() => {
    const ident = this.session.identity();
    return buildShareModel(this.ledger(), { name: ident.name, handle: ident.handle || this.handle() });
  });
  /** The matching render object for the input target. */
  private readonly shareObject = computed(() => {
    const id = this.obj().id;
    return this.model().objects.find((o) => o.id === id) ?? this.model().objects[0];
  });
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
      const formatId = this.formatId();
      const model = this.model();
      const o = this.shareObject();
      if (!this.isBrowser || !canvas || !o) {
        return;
      }
      this.fontsReady ??= ensureShareFonts();
      void this.fontsReady.then(() => renderObjectShareCard(canvas, model, o, themeId, formatId));
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
