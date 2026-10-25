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
import type { CelestoryStory, StoryTarget } from '../../models/story.model';
import type { ShareFormatId, ShareThemeId } from '../../models/share.types';
import {
  ensureShareFonts,
  renderTargetShareCard,
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
import type { ViewerIdentity } from '../../models/session.types';
import { shareCardIdentity } from '../../utils/display-identity.util';
import { canShareFiles, copyCanvasToClipboard, shareCanvas } from '../../utils/share-export.util';
import { SocialShareRowComponent } from '../social-share-row/social-share-row.component';

/**
 * Per-target Share — a single-item scope of the shared Share Studio shell: a live
 * canvas preview, identity, theme + format pickers and download / copy / share.
 * Reuses the Share Studio stylesheet so it stays visually identical. Client-side.
 */
@Component({
  selector: 'dba-target-share-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, SplitButtonComponent, SocialShareRowComponent],
  templateUrl: './target-share-modal.component.html',
  styleUrl: '../share-studio-modal/share-studio-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class TargetShareModalComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The target to render. */
  readonly target = input.required<StoryTarget>();
  /** The full story (resolves equipment names). */
  readonly story = input.required<CelestoryStory>();
  /** Public handle for the card's URL line. */
  readonly handle = input<string>('');
  /** Public deep-link to this target (empty when unpublished) — gates the share row. */
  readonly shareUrl = input<string>('');
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  /** Edits persist only in Private Preview — the one view with no published handle. */
  private readonly persistsIdentity = computed(() => !this.handle());
  /** The viewer's browser-saved identity — used and edited only in Private Preview. */
  private readonly session = inject(SessionStore);
  private readonly analytics = inject(AnalyticsService);
  /** Card-only name/username edits made here on a published or demo profile; never saved. */
  private readonly cardEdits = signal<Partial<ViewerIdentity>>({});
  /** Name and username shown in the inputs and printed on the card (see shareCardIdentity). */
  protected readonly cardIdentity = computed<ViewerIdentity>(() =>
    shareCardIdentity(
      this.persistsIdentity(),
      this.session.identity(),
      this.story(),
      this.handle(),
      this.cardEdits(),
    ),
  );

  /** Picker options. */
  protected readonly themes = SHARE_THEME_LIST;
  protected readonly formats = SHARE_FORMAT_LIST;

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

  /** Caption under the preview ("designation · name"). */
  protected readonly caption = computed(() => {
    const o = this.target();
    return o.designation ? `${o.designation}  ·  ${o.displayName}` : o.displayName;
  });
  /** Pixel dimensions of the current format, for the footer note. */
  protected readonly currentFormatDims = computed(() => {
    const f = SHARE_FORMATS[this.formatId()];
    return `${f.w} × ${f.h}px`;
  });

  /** Update the card's name from the dialog input. */
  setIdentityName(value: string): void {
    this.updateIdentity({ name: value });
  }
  /** Update the card's username from the dialog input (stored verbatim). */
  setIdentityUsername(value: string): void {
    this.updateIdentity({ username: value.replace(/^@+/, '') });
  }
  /** In preview, save the edit to the viewer's identity; elsewhere keep it on this card only. */
  private updateIdentity(edit: Partial<ViewerIdentity>): void {
    if (this.persistsIdentity()) {
      this.session.setIdentity({ ...this.session.identity(), ...edit });
    } else {
      this.cardEdits.update((current) => ({ ...current, ...edit }));
    }
  }

  /** Render-ready model with the card identity (username falls back to the handle). */
  private readonly model = computed(() => {
    const ident = this.cardIdentity();
    return buildShareModel(this.story(), { name: ident.name, username: ident.username || this.handle() });
  });
  /** The matching render target for the input target. */
  private readonly shareTarget = computed(() => {
    const id = this.target().id;
    return this.model().targets.find((o) => o.id === id) ?? this.model().targets[0];
  });

  private fontsReady: Promise<void> | null = null;

  constructor() {
    afterNextRender(() => this.canNativeShare.set(canShareFiles()));
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const themeId = this.themeId();
      const formatId = this.formatId();
      const model = this.model();
      const o = this.shareTarget();
      if (!this.isBrowser || !canvas || !o) {
        return;
      }
      this.fontsReady ??= ensureShareFonts();
      void this.fontsReady.then(() => renderTargetShareCard(canvas, model, o, themeId, formatId));
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

  /** Filename stem for this target's card. */
  private fileStem(): string {
    return `${(this.target().designation || this.target().displayName).replace(/\s+/g, '-').toLowerCase()}-celestory`;
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
    this.analytics.trackCelestoryShareExported('target', format);
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
    void copyCanvasToClipboard(canvas).then((ok) => {
      if (ok) {
        this.flashMessage('Copied');
      } else {
        this.downloadAs('png');
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
        this.downloadAs('png');
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
