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

@Component({
  selector: "dba-ui-black-hole-loader",
  standalone: true,
  templateUrl: "./black-hole-loader.component.html",
  styleUrls: ["./black-hole-loader.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.fill]": "fill()" },
})
export class BlackHoleLoaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild("starCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("wrapper") wrapperRef!: ElementRef<HTMLDivElement>;

  size = input<number>(100);
  fill = input<boolean>(false);

  private platformId = inject(PLATFORM_ID);
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: any[] = [];
  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private currentW = 100;
  private currentH = 100;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.fill()) {
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
          this.initParticles(w, h);
        }
      });
      this.resizeObserver.observe(this.wrapperRef.nativeElement);
    } else {
      const s = this.size();
      this.resize(s, s);
    }
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.loop();
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private resize(w: number, h: number): void {
    this.currentW = w;
    this.currentH = h;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.initParticles(w, h);
  }

  private initParticles(w: number, h: number): void {
    const maxRadius = Math.sqrt(w * w + h * h) * 0.7; // Start further out, beyond corners
    this.particles = Array.from({ length: 200 }, () => {
      const r = maxRadius * (0.4 + Math.random() * 0.6); // Bias towards far edges
      return {
        r: r,
        theta: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.006 + 0.003,
        inwardSpeed: Math.random() * 1.5 + 0.5,
        color: Math.random() < 0.5 ? 'pink' : 'cyan',
        size: Math.random() * 2 + 1,
        history: [],
      };
    });
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
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const eventHorizon = Math.min(w, h) * 0.15;
    
    // Draw swirling particles
    for (const p of this.particles) {
      p.theta += p.speed;
      p.r -= p.inwardSpeed;
      
      if (p.r < eventHorizon) {
        p.r = Math.sqrt(w * w + h * h) * (0.6 + Math.random() * 0.2); // Teleport back to corners/beyond
        p.history = []; // Reset tail on teleport
      }
      
      const x = cx + Math.cos(p.theta) * p.r;
      const y = cy + Math.sin(p.theta) * p.r * 0.6;
      
      p.history.push({ x, y });
      if (p.history.length > 40) {
        p.history.shift(); // Keep a longer, more dramatic trail length
      }

      const alpha = Math.min(1, Math.max(0, (p.r - eventHorizon) / 50));
      const rgb = p.color === 'pink' ? '255, 45, 149' : '0, 243, 255';
      
      // Draw tail with fading opacity
      if (p.history.length > 1) {
        ctx.lineWidth = p.size * 0.8;
        ctx.lineCap = 'round';
        for (let i = 0; i < p.history.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(p.history[i].x, p.history[i].y);
          ctx.lineTo(p.history[i + 1].x, p.history[i + 1].y);
          const segmentAlpha = alpha * (i / p.history.length) * 0.6; // Fade out older path segments
          ctx.strokeStyle = `rgba(${rgb}, ${segmentAlpha})`;
          ctx.stroke();
        }
      }

      // Draw head
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fill();
    }

    // Event Horizon edge glow
    const grad = ctx.createRadialGradient(cx, cy, eventHorizon * 0.8, cx, cy, eventHorizon * 1.5);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(255,45,149,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, eventHorizon * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner dark void
    ctx.beginPath();
    ctx.arc(cx, cy, eventHorizon, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
  }
}
