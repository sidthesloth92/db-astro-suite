import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { BRAND_CYAN, BRAND_PINK } from '../../models/brand.constants';
import { formatCount } from '../../utils/format.util';

/**
 * Branded upload→reveal: a full-screen overlay that counts up the hours of light
 * collected while a small constellation forms on a canvas, then fades out to
 * reveal the journey. Browser-only (afterNextRender); SSR renders nothing.
 */
@Component({
  selector: 'dba-processing-reveal',
  standalone: true,
  templateUrl: './processing-reveal.component.html',
  styleUrl: './processing-reveal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessingRevealComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** Total integration seconds — drives the hours count-up. */
  readonly seconds = input<number>(0);
  /** Emitted once the reveal has finished and should be removed. */
  readonly done = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** Counted-up hours shown in the centre. */
  protected readonly hours = signal(0);
  /** How many of the staged sub-lines are active. */
  protected readonly step = signal(0);
  /** True once the overlay starts fading out. */
  protected readonly out = signal(false);
  /** The staged status lines. */
  protected readonly lines = ['Reading light frames', 'Mapping targets & sessions', 'Charting your journey'];

  private rafId = 0;
  private hoursRaf = 0;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    // Steps, fade, completion and the constellation run on a fixed schedule from
    // mount. The hours count-up is driven separately so a late-arriving `seconds`
    // (the profile page mounts the reveal before its story has loaded) still
    // animates to the real total. When seconds is known at mount (Visualize), it
    // animates immediately — identical to before.
    afterNextRender(() => this.startTimeline());
    effect(() => this.animateHours(Math.round(this.seconds() / 3600)));
    this.destroyRef.onDestroy(() => {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      if (this.hoursRaf) {
        cancelAnimationFrame(this.hoursRaf);
      }
      this.timers.forEach((t) => clearTimeout(t));
    });
  }

  private startTimeline(): void {
    this.timers.push(setTimeout(() => this.step.set(1), 900));
    this.timers.push(setTimeout(() => this.step.set(2), 1500));
    this.timers.push(setTimeout(() => this.out.set(true), 2700));
    this.timers.push(setTimeout(() => this.done.emit(), 3200));

    this.drawConstellation();
  }

  /** Ease the displayed hours from their current value to a (possibly late) target. */
  private animateHours(target: number): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.hours.set(target);
      return;
    }
    if (this.hoursRaf) {
      cancelAnimationFrame(this.hoursRaf);
    }
    const from = untracked(() => this.hours());
    if (target === from) {
      return;
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const k = Math.min(1, (now - t0) / 1500);
      this.hours.set(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) {
        this.hoursRaf = requestAnimationFrame(tick);
      }
    };
    this.hoursRaf = requestAnimationFrame(tick);
  }

  private drawConstellation(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.32;
    const N = 9;
    const nodes: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.283 - 1.2 + Math.sin(i * 2.3) * 0.4;
      const rr = R * (0.55 + ((i * 37) % 50) / 100);
      nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.8 });
    }
    const t0 = performance.now();
    const draw = (now: number): void => {
      const k = Math.min(1, (now - t0) / 2600);
      ctx.clearRect(0, 0, W, H);
      const shown = Math.floor(k * N);
      ctx.lineWidth = 1.3;
      for (let i = 1; i <= shown && i < N; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        const mt = i / N;
        ctx.strokeStyle = `rgba(${(255 + (25 - 255) * mt) | 0},${(42 + (230 - 42) * mt) | 0},${(123 + (221 - 123) * mt) | 0},0.5)`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let i = 0; i <= shown && i < N; i++) {
        const p = nodes[i];
        const col = i % 2 ? BRAND_CYAN : BRAND_PINK;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, 6.283);
        ctx.fill();
      }
      if (k < 1) {
        this.rafId = requestAnimationFrame(draw);
      }
    };
    this.rafId = requestAnimationFrame(draw);
  }

  /** Thousands-separated hours for the template. */
  protected fmt(n: number): string {
    return formatCount(n);
  }
}
