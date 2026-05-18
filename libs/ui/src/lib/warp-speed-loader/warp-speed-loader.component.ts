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
  selector: "dba-ui-warp-speed-loader",
  standalone: true,
  templateUrl: "./warp-speed-loader.component.html",
  styleUrls: ["./warp-speed-loader.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.fill]": "fill()" },
})
export class WarpSpeedLoaderComponent implements AfterViewInit, OnDestroy {
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
    this.ctx = this.canvasRef.nativeElement.getContext("2d");
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
    this.particles = Array.from({ length: 150 }, () => ({
      x: (Math.random() - 0.5) * w * 2,
      y: (Math.random() - 0.5) * h * 2,
      z: Math.random() * w,
      color: Math.random() < 0.3 ? "cyan" : "white",
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
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, w, h);

    for (const p of this.particles) {
      const pastZ = p.z;
      p.z -= 4;
      if (p.z <= 0) {
        p.z = w;
        p.x = (Math.random() - 0.5) * w * 2;
        p.y = (Math.random() - 0.5) * h * 2;
        continue;
      }
      const x = cx + (p.x / p.z) * 100;
      const y = cy + (p.y / p.z) * 100;
      const px = cx + (p.x / pastZ) * 100;
      const py = cy + (p.y / pastZ) * 100;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, 3 - (p.z / w) * 3);
      ctx.stroke();
    }
  }
}
