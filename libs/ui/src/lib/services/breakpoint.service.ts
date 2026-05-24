import {
  afterNextRender,
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Width (in CSS pixels) below which the UI is considered "mobile".
 * Set to 1080 so that all common tablet portrait widths (iPad Mini 768,
 * iPad Air 11" 820, iPad Air 13" 1024, iPad Pro 13" 1032) collapse into
 * the mobile shell. Tablet landscape widths (≥1180) stay on desktop.
 * Exported for consumers that need to mirror the breakpoint in templates
 * (e.g. media queries derived from this constant).
 */
export const MOBILE_BREAKPOINT_PX = 1080;

/**
 * Reactive mobile-breakpoint service.
 *
 * Exposes a single `isMobile` signal that flips when the viewport width
 * crosses `MOBILE_BREAKPOINT_PX`. SSR-safe: the resize listener is only
 * attached in a browser context, inside `afterNextRender` so it never
 * runs on the server. The listener is removed automatically when the
 * root injector is destroyed.
 */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** True when the current viewport width is below `MOBILE_BREAKPOINT_PX`. */
  readonly isMobile = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    afterNextRender(() => {
      this.updateFromWidth(window.innerWidth);
      const onResize = (): void => this.updateFromWidth(window.innerWidth);
      window.addEventListener('resize', onResize, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
      });
    });
  }

  /**
   * Sets `isMobile` based on a given width. Public for tests that need to
   * simulate viewport changes without dispatching DOM events.
   */
  updateFromWidth(width: number): void {
    const next = width < MOBILE_BREAKPOINT_PX;
    if (this.isMobile() !== next) {
      this.isMobile.set(next);
    }
  }
}
