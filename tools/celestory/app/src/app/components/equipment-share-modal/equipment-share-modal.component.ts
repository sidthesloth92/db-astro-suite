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
import type { CelestoryLedger, LedgerEquipment } from '../../models/ledger.model';
import type { EquipmentShareData, ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  buildEquipmentShareData,
  ensureShareFonts,
  renderEquipmentShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
  THEME_MOTIF,
} from '../../utils/share-card.util';
import { copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Per-equipment Share — a live canvas studio scoped to ONE piece of gear. Pick a
 * theme + format (story / square only) and download / copy / share. Client-side.
 */
@Component({
  selector: 'dba-equipment-share-modal',
  standalone: true,
  imports: [CelIconComponent],
  templateUrl: './equipment-share-modal.component.html',
  styleUrl: './equipment-share-modal.component.css',
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

  /** Picker options — equipment cards omit landscape. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST.filter((f) => f.id !== 'landscape');

  /** Selections. */
  protected readonly themeId = signal<ShareThemeId>('star');
  /** The motif painted for the selected theme. */
  protected readonly backgroundId = computed(() => THEME_MOTIF[this.themeId()]);
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly flash = signal('');

  /** Whether this gear is a camera (tweaks the description copy). */
  protected readonly isCamera = computed(() => this.equip().kind.toLowerCase() === 'camera');

  private readonly displayUrl = computed(() => profileDisplayUrl(this.handle()));
  /** The equipment card data. */
  protected readonly data = computed<EquipmentShareData>(() =>
    buildEquipmentShareData(this.equip(), this.ledger(), this.displayUrl()),
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
      void this.fontsReady.then(() => renderEquipmentShareCard(canvas, themeId, backgroundId, formatId, data));
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
