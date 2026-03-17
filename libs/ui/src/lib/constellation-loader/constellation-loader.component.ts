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
  color: "pink" | "cyan";
}

@Component({
  selector: "dba-ui-constellation-loader",
  standalone: true,
  templateUrl: "./constellation-loader.component.html",
  styleUrls: ["./constellation-loader.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.fill]": "fill()" },
})
export class ConstellationLoaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild("starCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("wrapper") wrapperRef!: ElementRef<HTMLDivElement>;

  /** Fixed width/height in px. Ignored when fill=true. */
  size = input<number>(100);
  /** When true, the canvas fills its container and resizes with it. */
  fill = input<boolean>(false);

  private platformId = inject(PLATFORM_ID);
  private ctx: CanvasRenderingContext2D | null = null;
  private stars: Star[] = [];
  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private currentW = 100;
  private currentH = 100;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.fill()) {
      // Observe the wrapper div directly — it is sized by CSS (width/height: 100%)
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w > 0 && h > 0 && (w !== this.currentW || h !== this.currentH)) {
          this.currentW = w;
          this.currentH = h;
          const canvas = this.canvasRef.nativeElement;
          canvas.width = w;
          canvas.height = h;
          // Do NOT set canvas.style dimensions — CSS handles display size in fill mode
          this.initStars(w, h);
        }
      });
      this.resizeObserver.observe(this.wrapperRef.nativeElement);
    } else {
      const s = this.size();
      this.resize(s, s);
    }
    this.ctx = this.canvasRef.nativeElement.getContext("2d");
    this.loop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private resize(w: number, h: number): void {
    this.currentW = w;
    this.currentH = h;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = w;
    canvas.height = h;
    // Always pin display size in px — prevents any CSS from stretching it
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.initStars(w, h);
  }

  private initStars(w: number, h: number): void {
    this.stars = Array.from({ length: 28 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2.5 + 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      color: Math.random() < 0.5 ? "pink" : "cyan",
    }));
  }

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.currentW;
    const h = this.currentH;
    // maxDist relative to the shorter dimension so density feels consistent
    const maxDist = Math.min(w, h) * 0.45;

    ctx.clearRect(0, 0, w, h);

    // Move and bounce stars
    for (const star of this.stars) {
      star.x += star.vx;
      star.y += star.vy;
      if (star.x < 0) {
        star.x = 0;
        star.vx = Math.abs(star.vx);
      }
      if (star.x > w) {
        star.x = w;
        star.vx = -Math.abs(star.vx);
      }
      if (star.y < 0) {
        star.y = 0;
        star.vy = Math.abs(star.vy);
      }
      if (star.y > h) {
        star.y = h;
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
          // Use a gradient so the line blends between the two star colors
          if (a.color === b.color) {
            const rgb = a.color === "pink" ? "255, 45, 149" : "0, 243, 255";
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
          } else {
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(255, 45, 149, ${alpha})`);
            grad.addColorStop(1, `rgba(0, 243, 255, ${alpha})`);
            ctx.strokeStyle = grad;
          }
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Draw stars
    for (const star of this.stars) {
      const pulse = Math.sin(star.pulsePhase) * 0.3 + 0.7;
      const r = star.radius * pulse;
      const rgb = star.color === "pink" ? "255, 45, 149" : "0, 243, 255";

      // Soft glow halo
      const grd = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        r * 6,
      );
      grd.addColorStop(0, `rgba(${rgb}, ${0.85 * pulse})`);
      grd.addColorStop(0.35, `rgba(${rgb}, ${0.3 * pulse})`);
      grd.addColorStop(1, `rgba(${rgb}, 0)`);
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
