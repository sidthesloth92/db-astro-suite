import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { CF_LINK_DISTANCE, CF_MAX_DPR } from './constellation-field.constants';
import type { FieldPoint, TaggedStar } from './constellation-field.model';
import {
  createPoints,
  createTagged,
  lerpLineColor,
} from './constellation-field.util';

/**
 * Full-bleed animated background for the astrogram app — a living
 * constellation field: drifting, twinkling stars that self-connect with
 * pink→purple→blue lines, gentle cursor parallax, and a few tagged anchor
 * stars with pulsing reticles + sparkles. Projected children render on top.
 *
 * The canvas loop runs outside Angular (no change detection per frame),
 * pauses when the tab is hidden, honours `prefers-reduced-motion` (single
 * static frame), and tears everything down on destroy.
 */
@Component({
  selector: 'dba-ag-constellation-field',
  standalone: true,
  templateUrl: './constellation-field.html',
  styleUrls: ['./constellation-field.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstellationFieldComponent {
  /** Backing canvas the field is painted onto. */
  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  private ctx: CanvasRenderingContext2D | null = null;
  private points: FieldPoint[] = [];
  private tagged: TaggedStar[] = [];
  private rafId = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private rectLeft = 0;
  private rectTop = 0;
  private t0 = 0;
  private hidden = false;
  private prefersReduced = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly mouse = { x: 0, y: 0, active: false };

  constructor() {
    afterNextRender(() => this.init());
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /** Sets up the canvas, listeners and animation loop (browser only). */
  private init(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, CF_MAX_DPR);
    this.prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.t0 = performance.now();

    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
      window.addEventListener('pointerleave', this.onPointerLeave);
      document.addEventListener('visibilitychange', this.onVisibility);
      if (!this.prefersReduced) {
        this.rafId = requestAnimationFrame(this.frame);
      }
    });
  }

  /** Cancels the loop and removes every listener / observer. */
  private teardown(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** Re-measures the canvas, rescales the backing store and reseeds nodes. */
  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.rectLeft = rect.left;
    this.rectTop = rect.top;
    if (this.w === 0 || this.h === 0) return;
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.points = createPoints(this.w, this.h);
    this.tagged = createTagged(this.w, this.h);
    if (this.prefersReduced) {
      this.t0 = performance.now();
      this.frame(this.t0);
    }
  }

  /** One animation frame: integrate, link, twinkle, draw, reschedule. */
  private readonly frame = (now: number): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min(40, now - this.t0);
    this.t0 = now;
    const w = this.w;
    const h = this.h;
    ctx.clearRect(0, 0, w, h);

    for (const p of this.points) {
      p.x += p.vx * (dt * 0.06) * (0.4 + p.depth);
      p.y += p.vy * (dt * 0.06) * (0.4 + p.depth);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
      if (this.mouse.active) {
        p.x += (this.mouse.x - w / 2) * 0.00006 * p.depth * dt;
        p.y += (this.mouse.y - h / 2) * 0.00006 * p.depth * dt;
      }
      p.tw += 0.0012 * p.tws * dt;
    }
    for (const g of this.tagged) {
      g.x += g.vx * (dt * 0.05);
      g.y += g.vy * (dt * 0.05);
      if (g.x < 40 || g.x > w - 40) g.vx *= -1;
      if (g.y < 40 || g.y > h - 40) g.vy *= -1;
      g.pulse += 0.0022 * dt;
    }

    // Self-connecting lines between any two nearby nodes.
    const max2 = CF_LINK_DISTANCE * CF_LINK_DISTANCE;
    ctx.lineWidth = 1;
    const nodes: (FieldPoint | TaggedStar)[] = [...this.points, ...this.tagged];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < max2) {
          const alpha = 1 - Math.sqrt(d2) / CF_LINK_DISTANCE;
          const mid = (a.x + b.x) / 2 / w;
          ctx.strokeStyle = lerpLineColor(Math.max(0, Math.min(1, mid)));
          ctx.globalAlpha = alpha * 0.32;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Twinkling star cores.
    for (const p of this.points) {
      const twinkle = 0.55 + 0.45 * Math.sin(p.tw);
      ctx.globalAlpha = twinkle * (0.5 + 0.5 * p.depth);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Tagged anchors: glow + sparkle + pulsing reticle.
    for (const g of this.tagged) {
      const pulse = 0.5 + 0.5 * Math.sin(g.pulse);
      const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 22);
      glow.addColorStop(0, `${g.color}cc`);
      glow.addColorStop(1, `${g.color}00`);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 22, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.drawSparkle(ctx, g.x, g.y, 5.5);
      ctx.strokeStyle = g.color;
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 9 + pulse * 3, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (!this.prefersReduced && !this.hidden) {
      this.rafId = requestAnimationFrame(this.frame);
    }
  };

  /** Draws a 4-point sparkle/diamond centred at (cx, cy). */
  private drawSparkle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
  ): void {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
    ctx.fill();
  }

  /** Tracks the cursor (canvas-relative) for the parallax drift. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    this.mouse.x = event.clientX - this.rectLeft;
    this.mouse.y = event.clientY - this.rectTop;
    this.mouse.active = true;
  };

  /** Stops parallax when the pointer leaves the window. */
  private readonly onPointerLeave = (): void => {
    this.mouse.active = false;
  };

  /** Pauses the loop while the tab is hidden; resumes on return. */
  private readonly onVisibility = (): void => {
    this.hidden = document.hidden;
    if (!this.hidden && !this.prefersReduced) {
      this.t0 = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    }
  };
}
