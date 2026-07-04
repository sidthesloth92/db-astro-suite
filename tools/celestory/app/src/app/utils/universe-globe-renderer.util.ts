/**
 * UniverseGlobe canvas renderer — a slowly rotating celestial globe whose nodes
 * are the user's imaged targets at their real RA/Dec, threaded by great-circle
 * arcs with a travelling light pulse. Browser-only: instantiate inside
 * `afterNextRender`. Ported from the Celestory design.
 */
import { BRAND_PINK } from '../models/brand.constants';
import type { StoryTarget } from '../models/story.model';
import type { Vec3 } from '../models/sky.types';
import { D2R, targetRaDec } from './celestial.util';

/** Single premium accent for the entry globe (brand pink). */
const GLOBE_ACCENT = BRAND_PINK;

interface GlobeStar extends Vec3 {
  m: number;
}
interface GlobeArc {
  pts: Vec3[];
  col: string;
  ph: number;
}

export class UniverseGlobeRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private w = 0;
  private h = 0;
  private readonly dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  private readonly spin = { a: 0, v: 0.0022 };
  private readonly bg: GlobeStar[] = [];
  private readonly tg: Vec3[] = [];
  private readonly arcs: GlobeArc[] = [];
  private readonly TILT = 24 * D2R;
  private readonly cosT = Math.cos(this.TILT);
  private readonly sinT = Math.sin(this.TILT);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    targets: readonly StoryTarget[],
    private readonly isHovered: () => boolean,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    this.ctx = ctx;

    // background stars (fibonacci sphere)
    const n = 280;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * 2.399963;
      this.bg.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, m: Math.random() });
    }
    // targets at their celestial coordinates (lon = RA, lat = Dec)
    for (const o of targets) {
      const coords = targetRaDec(o);
      if (!coords) {
        continue;
      }
      const lat = coords[1] * D2R;
      const lon = coords[0] * D2R;
      this.tg.push({ x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon) });
    }
    // a few great-circle arcs between bright pairs
    for (let i = 0; i + 1 < this.tg.length && this.arcs.length < 7; i += 3) {
      const a = this.tg[i];
      const b = this.tg[(i + 2) % this.tg.length];
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      const om = Math.acos(dot);
      if (om < 0.15 || om > 3.0) {
        continue;
      }
      const pts: Vec3[] = [];
      const steps = 34;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const s0 = Math.sin((1 - t) * om) / Math.sin(om);
        const s1 = Math.sin(t * om) / Math.sin(om);
        pts.push({ x: a.x * s0 + b.x * s1, y: a.y * s0 + b.y * s1, z: a.z * s0 + b.z * s1 });
      }
      this.arcs.push({ pts, col: GLOBE_ACCENT, ph: Math.random() * 6.283 });
    }
  }

  /** Set the rendered viewport size + DPR backing store. */
  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /** Start the render loop. */
  start(): void {
    const loop = (): void => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Stop the render loop. */
  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private rot(p: Vec3, a: number): Vec3 {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x1 = p.x * ca + p.z * sa;
    const z1 = -p.x * sa + p.z * ca;
    const y1 = p.y;
    const y2 = y1 * this.cosT - z1 * this.sinT;
    const z2 = y1 * this.sinT + z1 * this.cosT;
    return { x: x1, y: y2, z: z2 };
  }

  private draw(): void {
    const { ctx, w: W, h: H, dpr } = this;
    const sp = this.spin;
    const targetV = this.isHovered() ? 0.0052 : 0.0022;
    sp.v += (targetV - sp.v) * 0.04;
    sp.a += sp.v;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.37;
    const t = performance.now() * 0.001;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const proj = (p: Vec3): { x: number; y: number; z: number } => ({ x: cx + p.x * R, y: cy - p.y * R, z: p.z });

    // graticule
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const la = lat * D2R;
      const ry = Math.sin(la);
      const rr = Math.cos(la);
      let prev: { x: number; y: number; z: number } | null = null;
      for (let lon = 0; lon <= 360; lon += 12) {
        const lo = lon * D2R;
        const p = proj(this.rot({ x: rr * Math.cos(lo), y: ry, z: rr * Math.sin(lo) }, sp.a));
        if (prev) {
          ctx.strokeStyle = `rgba(224,228,242,${0.05 + 0.1 * Math.max(0, p.z)})`;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        prev = p;
      }
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const lo = lon * D2R;
      let prev: { x: number; y: number; z: number } | null = null;
      for (let lat = -90; lat <= 90; lat += 12) {
        const la = lat * D2R;
        const p = proj(this.rot({ x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: Math.cos(la) * Math.sin(lo) }, sp.a));
        if (prev) {
          ctx.strokeStyle = `rgba(224,228,242,${0.04 + 0.09 * Math.max(0, p.z)})`;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        prev = p;
      }
    }

    // background stars
    for (const s of this.bg) {
      const p = proj(this.rot(s, sp.a));
      if (p.z < -0.05) {
        continue;
      }
      const a = (0.25 + 0.75 * Math.max(0, p.z)) * (0.5 + 0.5 * s.m) * (0.7 + 0.3 * Math.sin(t * 1.4 + s.x * 8));
      ctx.fillStyle = `rgba(228,236,255,${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + s.m * 1.0, 0, 6.283);
      ctx.fill();
    }

    // arcs with travelling pulse
    for (const arc of this.arcs) {
      ctx.lineWidth = 1.1;
      for (let i = 0; i < arc.pts.length - 1; i++) {
        const p1 = proj(this.rot(arc.pts[i], sp.a));
        const p2 = proj(this.rot(arc.pts[i + 1], sp.a));
        const zf = Math.max(0, (p1.z + p2.z) / 2);
        ctx.strokeStyle = arc.col + Math.round((0.1 + 0.32 * zf) * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      const hp = (Math.sin(t * 0.7 + arc.ph) * 0.5 + 0.5) * (arc.pts.length - 1);
      const i0 = Math.floor(hp);
      const i1 = Math.min(arc.pts.length - 1, i0 + 1);
      const f = hp - i0;
      const a0 = arc.pts[i0];
      const a1 = arc.pts[i1];
      const mid = { x: a0.x + (a1.x - a0.x) * f, y: a0.y + (a1.y - a0.y) * f, z: a0.z + (a1.z - a0.z) * f };
      const pp = proj(this.rot(mid, sp.a));
      if (pp.z > 0) {
        const g = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 6);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 6, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 1.5, 0, 6.283);
        ctx.fill();
      }
    }

    // target nodes
    for (const tt of this.tg) {
      const p = proj(this.rot(tt, sp.a));
      const front = p.z >= 0;
      const a = front ? 1 : 0.16;
      ctx.globalAlpha = a;
      ctx.fillStyle = GLOBE_ACCENT;
      ctx.beginPath();
      ctx.arc(p.x, p.y, front ? 2.1 : 1.3, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = GLOBE_ACCENT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, front ? 4 : 2.4, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // rim light (subtle)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,138,184,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.stroke();
  }
}
