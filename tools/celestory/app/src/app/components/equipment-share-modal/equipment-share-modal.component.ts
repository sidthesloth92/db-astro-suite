import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
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
import type { CelestoryStory, StoryEquipment } from '../../models/story.model';
import type { ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  ensureShareFonts,
  renderEquipmentShareCard,
  SHARE_FORMAT_LIST,
  SHARE_FORMATS,
  SHARE_THEME_LIST,
} from '../../utils/share-card.util';
import {
  AnalyticsService,
  IconButtonComponent,
  SplitButtonComponent,
  TextButtonComponent,
} from '@db-astro-suite/ui';
import { DOWNLOAD_FORMAT_MENU } from '../../models/share.constants';
import { buildShareModel } from '../../utils/share-model.util';
import { SessionStore } from '../../services/session-store.service';
import { canShareFiles, copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { SocialShareRowComponent } from '../social-share-row/social-share-row.component';

/**
 * Per-equipment Share — a single-item scope of the shared Share Studio shell: a
 * live canvas preview, identity, theme + format (story / square only) and
 * download / copy / share. Reuses the Share Studio stylesheet. Client-side.
 */
@Component({
  selector: 'dba-equipment-share-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, SplitButtonComponent, SocialShareRowComponent],
  templateUrl: './equipment-share-modal.component.html',
  styleUrl: '../share-studio-modal/share-studio-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class EquipmentShareModalComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The equipment to render. */
  readonly equip = input.required<StoryEquipment>();
  /** The full story (resolves captured target names). */
  readonly story = input.required<CelestoryStory>();
  /** Public handle for the card's URL line. */
  readonly handle = input<string>('');
  /** Public deep-link to this gear (empty when unpublished) — gates the share row. */
  readonly shareUrl = input<string>('');
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  /** Shared session identity (name / handle) printed on the card. */
  protected readonly session = inject(SessionStore);
  private readonly analytics = inject(AnalyticsService);

  /** Picker options — equipment cards omit landscape. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST.filter((f) => f.id !== 'landscape');

  /** Selections. */
  protected readonly themeId = signal<ShareThemeId>('star');
  protected readonly formatId = signal<ShareFormatId>('story');
  protected readonly flash = signal('');
  /** True when the OS share sheet can take image files (mobile) — set post-render. */
  protected readonly canNativeShare = signal(false);
  /** Active download format (PNG/JPEG) for the split button. */
  protected readonly dlFormat = signal<'png' | 'jpeg'>('png');
  /** Download-format menu for the split button. */
  protected readonly downloadMenu = DOWNLOAD_FORMAT_MENU;

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
  /** Update the shared identity username from the studio input (stored verbatim). */
  setIdentityUsername(value: string): void {
    this.session.setIdentity({ ...this.session.identity(), username: value.replace(/^@+/, '') });
  }

  /** Render-ready model, with the edited identity (username falls back to the handle). */
  private readonly model = computed(() => {
    const ident = this.session.identity();
    return buildShareModel(this.story(), { name: ident.name, username: ident.username || this.handle() });
  });
  /** The matching render equipment for the input gear. */
  private readonly shareEquip = computed(() => {
    const id = this.equip().id;
    return this.model().equipment.find((e) => e.id === id) ?? this.model().equipment[0];
  });

  private fontsReady: Promise<void> | null = null;

  constructor() {
    afterNextRender(() => this.canNativeShare.set(canShareFiles()));
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

  /** Switches the active download format (from the split-button menu). */
  setDlFormat(f: string): void {
    this.dlFormat.set(f === 'jpeg' ? 'jpeg' : 'png');
  }

  /** Download the current card as PNG or JPEG. */
  downloadAs(format: 'png' | 'jpeg'): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    this.analytics.trackCelestoryShareExported('equipment', format);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.fileStem()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.flashMessage('Downloaded');
      },
      mime,
      format === 'jpeg' ? 0.92 : undefined,
    );
  }

  /** Copy the current card to the clipboard (falls back to download). */
  copy(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void copyCanvasToClipboard(canvas).then((ok) => (ok ? this.flashMessage('Copied') : this.downloadAs('png')));
  }

  /** Share the current card via the Web Share API (falls back to download). */
  share(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    void shareCanvas(canvas, `${this.fileStem()}.png`).then((shared) => {
      if (!shared) {
        this.downloadAs('png');
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
