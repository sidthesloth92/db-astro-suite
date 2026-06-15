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
import type { CelestoryLedger, LedgerEquipment } from '../../models/ledger.model';
import type { ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  ensureShareFonts,
  renderEquipmentShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
} from '../../utils/share-card.util';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { buildShareModel } from '../../utils/share-model.util';
import { SessionStore } from '../../services/session-store.service';
import { slugifyHandle } from '../../utils/handle.util';
import { copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';

/**
 * Per-equipment Share — a single-item scope of the shared Share Studio shell: a
 * live canvas preview, identity, theme + format (story / square only) and
 * download / copy / share. Reuses the Share Studio stylesheet. Client-side.
 */
@Component({
  selector: 'dba-equipment-share-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent],
  templateUrl: './equipment-share-modal.component.html',
  styleUrl: '../share-studio-modal/share-studio-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class EquipmentShareModalComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The equipment to render. */
  readonly equip = input.required<LedgerEquipment>();
  /** The full ledger (resolves captured target names). */
  readonly ledger = input.required<CelestoryLedger>();
  /** Public handle for the card's URL line. */
  readonly handle = input<string>('');
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  /** Shared session identity (name / handle) printed on the card. */
  protected readonly session = inject(SessionStore);

  /** Picker options — equipment cards omit landscape. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST.filter((f) => f.id !== 'landscape');

  /** Selections. */
  protected readonly themeId = signal<ShareThemeId>('star');
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly flash = signal('');

  /** Whether this gear is a camera (tweaks the description copy). */
  protected readonly isCamera = computed(() => this.equip().kind.toLowerCase() === 'camera');

  /** Caption under the preview ("kind · name"). */
  protected readonly caption = computed(() => `${this.equip().kind}  ·  ${this.equip().displayName}`);
  /** Pixel dimensions of the current format, for the footer note. */
  protected readonly currentFormatDims = computed(() => {
    const f = SHARE_FORMATS[this.formatId()];
    return `${f.w} × ${f.h}px`;
  });

  /** Update the shared identity name from the studio input. */
  setIdentityName(value: string): void {
    this.session.setIdentity({ ...this.session.identity(), name: value });
  }
  /** Update the shared identity handle from the studio input. */
  setIdentityHandle(value: string): void {
    this.session.setIdentity({ ...this.session.identity(), handle: slugifyHandle(value) });
  }

  /** Render-ready model, with the edited identity (handle falls back to the input). */
  private readonly model = computed(() => {
    const ident = this.session.identity();
    return buildShareModel(this.ledger(), { name: ident.name, handle: ident.handle || this.handle() });
  });
  /** The matching render equipment for the input gear. */
  private readonly shareEquip = computed(() => {
    const id = this.equip().id;
    return this.model().equipment.find((e) => e.id === id) ?? this.model().equipment[0];
  });

  private fontsReady: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const themeId = this.themeId();
      const formatId = this.formatId();
      const model = this.model();
      const e = this.shareEquip();
      if (!this.isBrowser || !canvas || !e) {
        return;
      }
      this.fontsReady ??= ensureShareFonts();
      void this.fontsReady.then(() => renderEquipmentShareCard(canvas, model, e, themeId, formatId));
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

  private fileStem(): string {
    return `${(this.equip().displayName || 'equipment').replace(/\s+/g, '-').toLowerCase()}-celestory`;
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
    void copyCanvasToClipboard(canvas).then((ok) => (ok ? this.flashMessage('Copied') : this.download()));
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

  /** Close when the backdrop itself is clicked. */
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
