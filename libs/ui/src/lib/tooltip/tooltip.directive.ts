import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

/** Placement of the tooltip relative to its host element. */
export type TooltipPlacement = 'top' | 'bottom';

/**
 * Lightweight, reusable tooltip. A snappier replacement for the native
 * `title` attribute (which has a ~1s browser delay and unstyled chrome): bind
 * `[dbaTooltip]` with the text to show. Multi-line text is supported
 * (newline-separated). The floating element is created on demand and appended
 * to `<body>`, positioned against the host's bounding box and clamped to the
 * viewport; it is click-through and themed via `/libs/theme` tokens.
 *
 * Mouse/pen show it on hover and hide on leave. Touch devices have no hover, so
 * a tap on the host toggles it; it then dismisses on the next interaction
 * outside the host.
 *
 * SSR-safe: all DOM work happens in pointer/click handlers, which only fire in
 * a browser.
 */
@Directive({
  selector: '[dbaTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  /** Tooltip text. Empty/whitespace disables the tooltip. */
  readonly dbaTooltip = input<string>('');
  /** Preferred placement relative to the host. Flips if it would clip the top. */
  readonly tooltipPlacement = input<TooltipPlacement>('top');
  /** Delay before showing, in ms — far snappier than the native title tooltip. */
  readonly tooltipDelay = input<number>(120);

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly doc = inject(DOCUMENT);

  private tip: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private outsideUnlisten: (() => void) | null = null;
  private lastPointerType = '';

  /** Records the pointer kind so {@link onClick} can tell a tap from a click. */
  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.lastPointerType = event.pointerType;
  }

  /**
   * Mouse/pen hover schedules a delayed show. Touch pointers have no hover, so
   * they are ignored here — taps are handled by {@link onClick} instead.
   */
  @HostListener('pointerenter', ['$event'])
  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.scheduleShow();
  }

  /** Mouse/pen leaving the host dismisses the tooltip. */
  @HostListener('pointerleave', ['$event'])
  onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.hide();
  }

  /**
   * Click handling. On touch (no hover) a tap toggles the tooltip — the only
   * way to surface it on a phone. On mouse/pen it is already visible from
   * hover, so a click simply dismisses it.
   */
  @HostListener('click')
  onClick(): void {
    if (this.lastPointerType === 'touch' && !this.tip) {
      this.showNow();
    } else {
      this.hide();
    }
  }

  /** @inheritDoc */
  ngOnDestroy(): void {
    this.hide();
  }

  /** Schedules the tooltip to appear after the configured delay (hover). */
  private scheduleShow(): void {
    const text = this.dbaTooltip().trim();
    if (!text) {
      return;
    }
    this.clearTimer();
    this.timer = setTimeout(() => this.show(text), this.tooltipDelay());
  }

  /** Shows the tooltip immediately — used by tap-to-open on touch devices. */
  private showNow(): void {
    const text = this.dbaTooltip().trim();
    if (!text) {
      return;
    }
    this.clearTimer();
    this.show(text);
  }

  /** Builds, styles, mounts and positions the tooltip element. */
  private show(text: string): void {
    if (this.tip) {
      return;
    }
    const tip: HTMLElement = this.renderer.createElement('div');
    this.renderer.setAttribute(tip, 'role', 'tooltip');
    this.applyStyles(tip);
    this.renderer.setProperty(tip, 'textContent', text);
    this.renderer.appendChild(this.doc.body, tip);
    this.tip = tip;
    this.attachOutsideDismiss();
    this.position();
    // Fade in after layout so the transition runs.
    this.doc.defaultView?.requestAnimationFrame(() => {
      if (this.tip) {
        this.renderer.setStyle(this.tip, 'opacity', '1');
      }
    });
  }

  /** Positions the tooltip centred over the host, clamped to the viewport. */
  private position(): void {
    if (!this.tip) {
      return;
    }
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const tipRect = this.tip.getBoundingClientRect();
    const gap = 8;
    const viewW = this.doc.defaultView?.innerWidth ?? tipRect.width;

    let top =
      this.tooltipPlacement() === 'bottom'
        ? hostRect.bottom + gap
        : hostRect.top - tipRect.height - gap;
    if (top < 4) {
      top = hostRect.bottom + gap; // flip below when it would clip the top
    }
    const left = Math.max(
      4,
      Math.min(hostRect.left + hostRect.width / 2 - tipRect.width / 2, viewW - tipRect.width - 4),
    );

    this.renderer.setStyle(this.tip, 'top', `${Math.round(top)}px`);
    this.renderer.setStyle(this.tip, 'left', `${Math.round(left)}px`);
  }

  /** Applies the themed, click-through floating styles to the tooltip element. */
  private applyStyles(el: HTMLElement): void {
    const set = (prop: string, value: string): void => this.renderer.setStyle(el, prop, value);
    set('position', 'fixed');
    set('top', '0');
    set('left', '0');
    set('z-index', '2000');
    set('pointer-events', 'none');
    set('max-width', '260px');
    set('padding', '6px 9px');
    set('border-radius', '6px');
    set('background', 'var(--db-color-surface-raised, #11151f)');
    set('border', '1px solid var(--db-color-border, #2a3344)');
    set('color', 'var(--db-color-text-primary, #e6edf3)');
    set('font-family', 'var(--db-font-ui, sans-serif)');
    set('font-size', '12px');
    set('line-height', '1.35');
    set('white-space', 'pre-line');
    set('box-shadow', '0 6px 20px rgba(0, 0, 0, 0.45)');
    set('opacity', '0');
    set('transition', 'opacity 0.12s ease');
  }

  /**
   * While the tooltip is open, dismiss it on the next pointer interaction
   * outside the host — the primary way a tapped (touch) tooltip is closed.
   */
  private attachOutsideDismiss(): void {
    this.outsideUnlisten = this.renderer.listen('document', 'pointerdown', (event: Event) => {
      const target = event.target;
      if (target instanceof Node && !this.host.nativeElement.contains(target)) {
        this.hide();
      }
    });
  }

  /** Removes the tooltip, the outside-dismiss listener, and any pending show. */
  private hide(): void {
    this.clearTimer();
    if (this.outsideUnlisten) {
      this.outsideUnlisten();
      this.outsideUnlisten = null;
    }
    if (this.tip) {
      this.renderer.removeChild(this.doc.body, this.tip);
      this.tip = null;
    }
  }

  /** Cancels a pending show timer. */
  private clearTimer(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
