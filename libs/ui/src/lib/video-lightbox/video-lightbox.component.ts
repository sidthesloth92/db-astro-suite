import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

/**
 * Full-screen modal that plays a video with native controls. Two-way bound
 * via `open` (or one-way `[open]` + `(openChange)`); closes on backdrop click,
 * the close button, or Escape. Locks body scroll while open and unmounts the
 * `<video>` on close so playback stops. Presentational only — no business logic.
 */
@Component({
  selector: 'dba-ui-video-lightbox',
  standalone: true,
  templateUrl: './video-lightbox.component.html',
  styleUrls: ['./video-lightbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoLightboxComponent {
  /** Video source URL (mp4). */
  readonly src = input.required<string>();
  /** Optional poster image shown before the video paints. */
  readonly poster = input<string>('');
  /** Accessible dialog label. */
  readonly label = input<string>('Demo video');
  /** Open state — two-way bindable. */
  readonly open = model<boolean>(false);

  /** Dialog element, focused on open so Escape is captured. */
  private readonly dialog = viewChild<ElementRef<HTMLDivElement>>('dialog');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor() {
    // Lock body scroll while the lightbox is open.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.document.body.style.overflow = this.open() ? 'hidden' : '';
    });
    // Move focus into the dialog when it opens so Escape works immediately.
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || !this.open()) return;
      this.dialog()?.nativeElement.focus();
    });
    // Never leave body scroll locked if destroyed while open.
    inject(DestroyRef).onDestroy(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.document.body.style.overflow = '';
      }
    });
  }

  /** Closes the lightbox. */
  close(): void {
    this.open.set(false);
  }
}
