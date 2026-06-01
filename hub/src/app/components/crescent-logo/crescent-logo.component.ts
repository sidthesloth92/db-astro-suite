import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

/**
 * DB Astro Suite brand mark — an animated crescent moon carrying the "DB"
 * monogram, ringed by a family of shimmering stars, with an optional
 * `ASTROSUITE` wordmark side-lockup.
 *
 * The intro is a drift-in reveal (moon phases in → D then B ease in from the
 * right → stars pop → wordmark fades in) settling into a perpetual float +
 * twinkle loop. The settled, fully-visible state is the inline default so the
 * mark renders correctly under SSR / reduced-motion even if the rAF intro
 * never runs. The drift-in only plays in the browser via `afterNextRender`.
 */
@Component({
  selector: 'dba-hub-crescent-logo',
  standalone: true,
  templateUrl: './crescent-logo.component.html',
  styleUrl: './crescent-logo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrescentLogoComponent {
  /** Pixel size (width & height) of the crescent mark. Defaults to 132. */
  readonly markSize = input<number>(132);
  /** When true, renders the `ASTROSUITE` wordmark lockup beside the mark. */
  readonly showWordmark = input<boolean>(false);
  /** When true, plays the drift-in intro animation on first render. */
  readonly animate = input<boolean>(true);

  /**
   * Emitted once the drift-in intro has settled (in the browser). Also fires
   * immediately when the intro is skipped (reduced motion / `animate=false`),
   * so consumers can reliably sequence work after the logo is in place.
   */
  readonly animationDone = output<void>();

  /**
   * Stable mask id shared by server + client renders. The mark is used once
   * per page (the hub hero), so a fixed id is hydration-safe and avoids the
   * random-id mismatch that would otherwise break Angular hydration.
   */
  protected readonly maskId = 'dba-crescent-shadow-mask';

  private readonly shadow = viewChild<ElementRef<SVGCircleElement>>('shadow');
  private readonly letterD = viewChild<ElementRef<SVGTextElement>>('letterD');
  private readonly letterB = viewChild<ElementRef<SVGTextElement>>('letterB');
  private readonly stars = viewChild<ElementRef<SVGGElement>>('stars');
  private readonly astro = viewChild<ElementRef<HTMLElement>>('astro');
  private readonly suite = viewChild<ElementRef<HTMLElement>>('suite');
  private readonly tagline = viewChild<ElementRef<HTMLElement>>('tagline');

  private rafId = 0;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private introDone = false;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // `afterNextRender` can still fire under the AnalogJS prerenderer, so
      // browser-only APIs (window / requestAnimationFrame) are gated here.
      if (!this.isBrowser) {
        return;
      }
      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.animate() || reduced) {
        // Settled state is already the inline default — just signal completion.
        this.finishIntro();
        return;
      }
      this.playIntro();
    });
    destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        cancelAnimationFrame(this.rafId);
      }
      if (this.settleTimer) {
        clearTimeout(this.settleTimer);
      }
    });
  }

  /** Signals that the intro has settled — emitted exactly once. */
  private finishIntro(): void {
    if (this.introDone) {
      return;
    }
    this.introDone = true;
    this.animationDone.emit();
  }

  /**
   * Runs the one-shot drift-in tween with `requestAnimationFrame`. A
   * `setTimeout` safety-net force-settles the mark so it can never get stuck
   * mid-reveal if a frame is dropped.
   */
  private playIntro(): void {
    const shadow = this.shadow()?.nativeElement;
    const letterD = this.letterD()?.nativeElement;
    const letterB = this.letterB()?.nativeElement;
    const stars = this.stars()?.nativeElement;
    if (!shadow || !letterD || !letterB || !stars) {
      this.finishIntro();
      return;
    }
    const astro = this.astro()?.nativeElement;
    const suite = this.suite()?.nativeElement;
    const tagline = this.tagline()?.nativeElement;

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
    // Softer deceleration used for the wordmark so ASTRO / SUITE glide in.
    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
    const easeInOut = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const ramp = (t: number, a: number, b: number): number =>
      Math.max(0, Math.min(1, (t - a) / (b - a)));

    const settle = (): void => {
      shadow.setAttribute('cx', '78');
      for (const el of [letterD, letterB]) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
      stars.style.opacity = '1';
      for (const el of [astro, suite, tagline]) {
        if (el) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      }
      this.finishIntro();
    };

    // Snap to the hidden start frame, then tween toward the settled state.
    shadow.setAttribute('cx', '14');
    letterD.style.opacity = '0';
    letterB.style.opacity = '0';
    stars.style.opacity = '0';
    for (const el of [astro, suite, tagline]) {
      if (el) {
        el.style.opacity = '0';
      }
    }

    const duration = 2900;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(duration, now - start) / 1000;
      shadow.setAttribute('cx', (14 + 64 * easeInOut(ramp(t, 0, 1.0))).toFixed(2));
      const pD = ramp(t, 0.9, 1.12);
      const pB = ramp(t, 1.1, 1.32);
      letterD.style.opacity = `${pD}`;
      letterB.style.opacity = `${pB}`;
      letterD.style.transform = `translateX(${(8 * (1 - easeOut(pD))).toFixed(2)}px)`;
      letterB.style.transform = `translateX(${(8 * (1 - easeOut(pB))).toFixed(2)}px)`;
      stars.style.opacity = `${ramp(t, 1.25, 1.5)}`;
      if (astro) {
        const pa = ramp(t, 1.45, 2.05);
        astro.style.opacity = `${easeOut(pa)}`;
        astro.style.transform = `translateX(${(16 * (1 - easeOutQuart(pa))).toFixed(2)}px)`;
      }
      if (suite) {
        const ps = ramp(t, 1.9, 2.5);
        suite.style.opacity = `${easeOut(ps)}`;
        suite.style.transform = `translateX(${(16 * (1 - easeOutQuart(ps))).toFixed(2)}px)`;
      }
      if (tagline) {
        const pt = ramp(t, 2.45, 2.85);
        tagline.style.opacity = `${easeOut(pt)}`;
        tagline.style.transform = `translateY(${(10 * (1 - easeOutQuart(pt))).toFixed(2)}px)`;
      }
      if (now - start < duration) {
        this.rafId = requestAnimationFrame(step);
      } else {
        settle();
      }
    };
    this.rafId = requestAnimationFrame(step);
    this.settleTimer = setTimeout(settle, duration + 400);
  }
}
