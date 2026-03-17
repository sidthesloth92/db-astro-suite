import { isPlatformBrowser } from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  input,
} from "@angular/core";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
}

@Component({
  selector: "dba-ui-constellation-loader",
  standalone: true,
  templateUrl: "./constellation-loader.component.html",
  styleUrls: ["./constellation-loader.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstellationLoaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild("starCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Width and height of the canvas in px. Defaults to 100. */
  size = input<number>(100);

  private platformId = inject(PLATFORM_ID);
  private ctx: CanvasRenderingContext2D | null = null;
  private stars: Star[] = [];
  private rafId = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef.nativeElement;
    const s = this.size();
    // Set internal resolution
    canvas.width = s;
    canvas.height = s;
    // Pin the CSS display size so parent flex/grid layouts cannot stretch it
    canvas.style.width = `${s}px`;
    canvas.style.height = `${s}px`;
    this.ctx = canvas.getContext('2d');
    this.initStars(s);
    this.loop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private initStars(s: number): void {
    this.stars = Array.from({ length: 28 }, () => ({
      x: Math.random() * s,
      y: Math.random() * s,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2.5 + 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.015,
    }));
  }

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const s = this.size();
    const maxDist = s * 0.65;

    ctx.clearRect(0, 0, s, s);

    // Move and bounce stars
    for (const star of this.stars) {
      star.x += star.vx;
      star.y += star.vy;
      if (star.x < 0) {
        star.x = 0;
        star.vx = Math.abs(star.vx);
      }
      if (star.x > s) {
        star.x = s;
        star.vx = -Math.abs(star.vx);
      }
      if (star.y < 0) {
        star.y = 0;
        star.vy = Math.abs(star.vy);
      }
      if (star.y > s) {
        star.y = s;
        star.vy = -Math.abs(star.vy);
      }
      star.pulsePhase += star.pulseSpeed;
    }

    // Draw connecting lines
    for (let i = 0; i < this.stars.length; i++) {
      for (let j = i + 1; j < this.stars.length; j++) {
        const a = this.stars[i];
        const b = this.stars[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.9;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Draw stars
    for (const star of this.stars) {
      const pulse = Math.sin(star.pulsePhase) * 0.3 + 0.7;
      const r = star.radius * pulse;

      // Soft glow halo
      const grd = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        r * 6,
      );
      grd.addColorStop(0, `rgba(0, 243, 255, ${0.85 * pulse})`);
      grd.addColorStop(0.35, `rgba(0, 243, 255, ${0.3 * pulse})`);
      grd.addColorStop(1, 'rgba(0, 243, 255, 0)');
      ctx.beginPath();
      ctx.arc(star.x, star.y, r * 6, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.fill();
    }
  }
}
