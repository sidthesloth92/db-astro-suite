import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import type { Shooter, Star, StarColor } from './live-starfield.model';

/**
 * Live, animated warp starfield rendered to a `<canvas>` — a React-free port of
 * the Starwizz preview renderer. Presentational only: no state beyond the local
 * simulation and no side effects outside its own canvas.
 *
 * SSR-safe: all canvas / `requestAnimationFrame` / `resize` work is gated to the
 * browser inside `afterNextRender`, and torn down on destroy. Honours
 * `prefers-reduced-motion` by painting a single static frame instead of looping.
 */
@Component({
  selector: 'dba-hub-live-starfield',
  standalone: true,
  templateUrl: './live-starfield.component.html',
  styleUrl: './live-starfield.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveStarfieldComponent {
  /** When true, stars stretch into warp streaks; otherwise they twinkle. */
  readonly warp = input<boolean>(true);
  /** When true, paints faint pink/cyan nebula glows behind the stars. */
  readonly nebula = input<boolean>(false);
  /** Optional explicit star count; defaults to 300 (warp) / 130 (twinkle). */
  readonly count = input<number | undefined>(undefined);

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cx = 0;
  private cy = 0;
  private t = 0;
  private stars: Star[] = [];
  private shooters: Shooter[] = [];
  private rafId = 0;
  private pink = '#ff2d95';
  private cyan = '#00e5ff';
  private readonly onResize = (): void => this.resize();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // `afterNextRender` can fire under the AnalogJS prerenderer, so gate all
      // browser-only canvas APIs here.
      if (!this.isBrowser) {
        return;
      }
      const ctx = this.canvasRef().nativeElement.getContext('2d');
      if (!ctx) {
        return;
      }
      this.ctx = ctx;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const styles = getComputedStyle(document.documentElement);
      this.pink =
        styles.getPropertyValue('--db-color-neon-pink').trim() || this.pink;
      this.cyan = styles.getPropertyValue('--db-color-cyan').trim() || this.cyan;
      this.resize();
      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        this.drawStatic();
        return;
      }
      window.addEventListener('resize', this.onResize);
      this.rafId = requestAnimationFrame(() => this.frame());
    });
    destroyRef.onDestroy(() => {
      if (!this.isBrowser) {
        return;
      }
      cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.onResize);
    });
  }

  /** Creates a star; `edge` spawns it at the far plane for warp recycling. */
  private mk(edge: boolean): Star {
    const c: StarColor =
      Math.random() < 0.18 ? 'cyan' : Math.random() < 0.12 ? 'pink' : 'white';
    return {
      x: (Math.random() - 0.5) * this.w,
      y: (Math.random() - 0.5) * this.h,
      z: edge ? this.w : Math.random() * this.w,
      pz: 0,
      c,
    };
  }

  /** Resizes the backing store to the element box and reseeds the field. */
  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.w = canvas.width = Math.max(1, rect.width * this.dpr);
    this.h = canvas.height = Math.max(1, rect.height * this.dpr);
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    const total = this.count() || (this.warp() ? 300 : 130);
    this.stars = [];
    for (let i = 0; i < total; i++) {
      this.stars.push(this.mk(false));
    }
  }

  /** Resolves a star's tint marker to a concrete CSS colour. */
  private colorOf(c: StarColor): string {
    return c === 'cyan' ? this.cyan : c === 'pink' ? this.pink : '#fff';
  }

  /** Paints the faint twin nebula glows (only used when `nebula` is set). */
  private paintNebula(ctx: CanvasRenderingContext2D): void {
    let g = ctx.createRadialGradient(
      this.w * 0.3,
      this.h * 0.4,
      0,
      this.w * 0.3,
      this.h * 0.4,
      this.w * 0.4,
    );
    g.addColorStop(0, 'rgba(255,42,123,0.06)');
    g.addColorStop(1, 'rgba(255,42,123,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    g = ctx.createRadialGradient(
      this.w * 0.72,
      this.h * 0.62,
      0,
      this.w * 0.72,
      this.h * 0.62,
      this.w * 0.42,
    );
    g.addColorStop(0, 'rgba(25,230,221,0.05)');
    g.addColorStop(1, 'rgba(25,230,221,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  /** One animation frame: advance + draw stars and shooting stars. */
  private frame(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.t++;
    ctx.fillStyle = 'rgba(7,7,12,0.32)';
    ctx.fillRect(0, 0, this.w, this.h);
    if (this.nebula()) {
      this.paintNebula(ctx);
    }
    const warp = this.warp();
    const speed = warp ? 6 : 1.5;
    const rot = 0.0006;
    for (const s of this.stars) {
      s.pz = s.z;
      s.z -= speed * this.dpr;
      if (s.z < 1) {
        const m = this.mk(true);
        s.x = m.x;
        s.y = m.y;
        s.z = this.w;
        s.pz = this.w;
        s.c = m.c;
      }
      const nx = s.x * Math.cos(rot) - s.y * Math.sin(rot);
      const ny = s.x * Math.sin(rot) + s.y * Math.cos(rot);
      s.x = nx;
      s.y = ny;
      const sx = this.cx + (s.x / s.z) * this.w;
      const sy = this.cy + (s.y / s.z) * this.w;
      const px = this.cx + (s.x / s.pz) * this.w;
      const py = this.cy + (s.y / s.pz) * this.w;
      const rr = Math.max(0.4, (1 - s.z / this.w) * 2.2 * this.dpr);
      const col = this.colorOf(s.c);
      if (warp) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = Math.min(1, (1 - s.z / this.w) * 1.2);
        ctx.lineWidth = rr;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else {
        ctx.fillStyle = col;
        ctx.globalAlpha =
          Math.min(1, (1 - s.z / this.w) * 1.1) *
          (0.5 + 0.5 * Math.sin((this.t + s.x) * 0.02));
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, 6.28);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (warp) {
      this.updateShooters(ctx);
    }
    this.rafId = requestAnimationFrame(() => this.frame());
  }

  /** Spawns, advances, and draws fading shooting-star streaks. */
  private updateShooters(ctx: CanvasRenderingContext2D): void {
    if (Math.random() < 0.012) {
      this.shooters.push({
        x: Math.random() * this.w,
        y: -20 * this.dpr,
        vx: (-1 - Math.random()) * 3 * this.dpr,
        vy: (2 + Math.random() * 2) * 3 * this.dpr,
        life: 1,
      });
    }
    for (let i = this.shooters.length - 1; i >= 0; i--) {
      const sh = this.shooters[i];
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.012;
      if (sh.life <= 0 || sh.y > this.h + 40) {
        this.shooters.splice(i, 1);
        continue;
      }
      const tx = sh.x - sh.vx * 6;
      const ty = sh.y - sh.vy * 6;
      const grad = ctx.createLinearGradient(tx, ty, sh.x, sh.y);
      grad.addColorStop(0, 'rgba(255,42,123,0)');
      grad.addColorStop(1, `rgba(255,255,255,${sh.life})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
    }
  }

  /** Paints one non-animated frame for reduced-motion users. */
  private drawStatic(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, this.w, this.h);
    for (const s of this.stars) {
      const sx = this.cx + (s.x / s.z) * this.w;
      const sy = this.cy + (s.y / s.z) * this.w;
      const rr = Math.max(0.4, (1 - s.z / this.w) * 2.2 * this.dpr);
      ctx.fillStyle = this.colorOf(s.c);
      ctx.globalAlpha = Math.min(1, (1 - s.z / this.w) * 1.1);
      ctx.beginPath();
      ctx.arc(sx, sy, rr, 0, 6.28);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
