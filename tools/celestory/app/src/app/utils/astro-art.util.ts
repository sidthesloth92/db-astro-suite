/**
 * Procedural, deterministic vector art for deep-sky target thumbnails — a
 * premium category motif (galaxy spiral / nebula shell / globular swarm /
 * planetary nebula / cluster constellation / orbits) painted on a dark base.
 * Brand-pink/cyan palette, no green. This is a SEPARATE motif set from the
 * share-slide themes (so re-tinting placeholders never affects slides).
 * Ported from the design's `objCategoryMotif`. Pure canvas; call in the browser.
 */
import { BRAND_CYAN, BRAND_PINK } from '../models/brand.constants';
import { hexLerp } from './color.util';

/** Palette the motifs paint with (placeholders use brand pink/cyan + gold). */
const ART_PALETTE = { hero: BRAND_PINK, accent: BRAND_CYAN, mid: '#9b6cff', gold: '#ffd98a' };

/** Seeded mulberry-ish RNG → deterministic art per target. */
function mkRand(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** `#rrggbb` + alpha → `rgba(...)`. */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A faint ambient star field across the whole canvas. */
function starfield(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, maxAlpha: number): void {
  const rand = mkRand(424242);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.5 + 0.3;
    ctx.globalAlpha = (0.2 + rand() * 0.8) * maxAlpha;
    ctx.fillStyle = rand() > 0.85 ? '#bfe0ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Three particle arms winding into a pinwheel galaxy with a golden core. */
function drawGalaxy(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number, tint: string): void {
  const armLight = hexLerp(tint, '#ffffff', 0.62);
  const scatterLight = hexLerp(tint, '#ffffff', 0.78);
  const rnd = mkRand(seed || 11);
  ctx.save();
  const rot = (rnd() - 0.5) * 1.6;
  const tilt = 0.52 + rnd() * 0.14;
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, hexA(tint, 0.12));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, tilt);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
  g.addColorStop(0, 'rgba(255,243,219,0.30)');
  g.addColorStop(0.35, hexA(tint, 0.11));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.95, 0, 6.283);
  ctx.fill();
  const arms = 3;
  const per = 190;
  const wrap = 3.9;
  for (let a = 0; a < arms; a++) {
    const a0 = a * (6.283 / arms);
    for (let i = 0; i < per; i++) {
      const tt = i / per;
      const ang = a0 + tt * wrap + (rnd() - 0.5) * 0.24;
      const rad = R * (0.1 + 0.88 * tt) * (1 + (rnd() - 0.5) * 0.09);
      const br = rnd();
      ctx.globalAlpha = (1 - tt) * 0.5 + 0.1;
      ctx.fillStyle = br > 0.84 ? tint : br > 0.62 ? armLight : br > 0.3 ? '#ffffff' : '#ffe9c4';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, rnd() * 1.6 + 0.4, 0, 6.283);
      ctx.fill();
    }
  }
  for (let i = 0; i < 170; i++) {
    const a = rnd() * 6.283;
    const rr = Math.pow(rnd(), 1.6) * R * 0.58;
    ctx.globalAlpha = 0.34 * (1 - rr / (R * 0.62)) + 0.05;
    ctx.fillStyle = rnd() > 0.7 ? scatterLight : '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, rnd() * 1.3 + 0.3, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.26);
  g.addColorStop(0, 'rgba(255,248,228,0.95)');
  g.addColorStop(0.5, hexA(ART_PALETTE.gold, 0.5));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.26, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** A circular nebula shell: smudge wash + crisp shell particles + embedded stars. */
function drawNebulaShell(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number): void {
  const ca = ART_PALETTE.hero;
  const cb = ART_PALETTE.accent;
  const rnd = mkRand((seed || 5) + 53);
  const k = R / 120;
  const rot = (rnd() - 0.5) * 1.2;
  const sq = 0.78 + rnd() * 0.14;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.15);
  g.addColorStop(0, hexA(ca, 0.14));
  g.addColorStop(0.55, hexA(ART_PALETTE.mid, 0.1));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.15, 0, 6.283);
  ctx.fill();
  for (let i = 0; i < 240; i++) {
    const a = rnd() * 6.283;
    const rr = R * (0.72 + (rnd() + rnd() - 1) * 0.42);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr * sq;
    const out = Math.min(1, Math.max(0, (rr / R - 0.5) / 0.6));
    ctx.globalAlpha = 0.05 + rnd() * 0.1;
    ctx.fillStyle = out > 0.6 ? cb : out > 0.3 ? ART_PALETTE.mid : ca;
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * 7 + 3) * k, 0, 6.283);
    ctx.fill();
  }
  for (let i = 0; i < 380; i++) {
    const a = rnd() * 6.283;
    const rr = R * (0.74 + (rnd() + rnd() - 1) * 0.34);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr * sq;
    const out = Math.min(1, Math.max(0, (rr / R - 0.55) / 0.5));
    const br = rnd();
    ctx.globalAlpha = 0.14 + rnd() * 0.4;
    ctx.fillStyle = br > 0.93 ? '#ffffff' : out > 0.6 ? cb : out > 0.32 ? ART_PALETTE.mid : ca;
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * 1.7 + 0.4) * k, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** A dense, centrally-concentrated star swarm (globular cluster). */
function drawGlobularSwarm(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number): void {
  const rnd = mkRand((seed || 3) + 13);
  const k = R / 130;
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.62);
  g.addColorStop(0, 'rgba(255,240,214,0.5)');
  g.addColorStop(0.5, 'rgba(255,225,180,0.14)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.62, 0, 6.283);
  ctx.fill();
  for (let i = 0; i < 540; i++) {
    const a = rnd() * 6.283;
    const rr = Math.pow(rnd(), 2.2) * R;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr * 0.94;
    const near = 1 - rr / R;
    const br = rnd();
    ctx.globalAlpha = 0.25 + near * 0.6;
    ctx.fillStyle = br > 0.86 ? ART_PALETTE.gold : br > 0.5 ? '#fff6e6' : br > 0.2 ? '#ffffff' : '#cfe2ff';
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * (0.6 + near * 1.1) + 0.35) * k, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A planetary nebula: a faint ring of particles around a hot white core. */
function drawPlanetaryNebula(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number): void {
  const ca = ART_PALETTE.hero;
  const cb = ART_PALETTE.accent;
  const rnd = mkRand((seed || 9) + 7);
  const k = R / 120;
  const rot = (rnd() - 0.5) * 0.9;
  const sq = 0.74 + rnd() * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  g.addColorStop(0, hexA(ca, 0.26));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.55, 0, 6.283);
  ctx.fill();
  for (let i = 0; i < 460; i++) {
    const a = rnd() * 6.283;
    const rr = R * (0.78 + (rnd() + rnd() - 1) * 0.22);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr * sq;
    const out = Math.min(1, Math.max(0, (rr / R - 0.62) / 0.45));
    const br = rnd();
    ctx.globalAlpha = 0.2 + rnd() * 0.5;
    ctx.fillStyle = br > 0.92 ? '#ffffff' : out > 0.62 ? cb : out > 0.34 ? ART_PALETTE.mid : ca;
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * 1.8 + 0.4) * k, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 10 * k);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(160,240,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 10 * k, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.4 * k, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** A small scattered constellation (open clusters / lone stars). */
function drawConstellation(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number): void {
  const rnd = mkRand((seed || 7) + 29);
  const n = 6 + Math.floor(rnd() * 3);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: cx + (rnd() - 0.5) * R * 1.5, y: cy + (rnd() - 0.5) * R * 1.5 });
  }
  ctx.lineWidth = 1;
  for (let i = 1; i < pts.length; i++) {
    const grd = ctx.createLinearGradient(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    grd.addColorStop(0, ART_PALETTE.hero);
    grd.addColorStop(1, ART_PALETTE.accent);
    ctx.strokeStyle = grd;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  pts.forEach((p, i) => {
    const col = i % 2 ? ART_PALETTE.accent : ART_PALETTE.hero;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
    g.addColorStop(0, hexA(col, 0.85));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, 6.283);
    ctx.fill();
  });
}

/** Concentric orbit rings with a bright body (generic / other). */
function drawOrbits(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, seed: number): void {
  const rnd = mkRand((seed || 4) + 17);
  for (let i = 0; i < 3; i++) {
    const rr = R * (0.45 + i * 0.28);
    ctx.strokeStyle = hexA(i % 2 ? ART_PALETTE.accent : ART_PALETTE.hero, 0.3);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.42, (rnd() - 0.5) * 0.6, 0, 6.283);
    ctx.stroke();
    const ang = rnd() * 6.283;
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr * 0.42;
    ctx.fillStyle = i % 2 ? ART_PALETTE.accent : ART_PALETTE.hero;
    ctx.beginPath();
    ctx.arc(px, py, 2.4, 0, 6.283);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
  g.addColorStop(0, 'rgba(255,248,228,0.95)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.22, 0, 6.283);
  ctx.fill();
}

/**
 * Render the category motif for a target thumbnail onto `canvas`. Sizes the
 * backing store to the element's box × a supersample factor for crisp art.
 */
export function renderTargetArt(canvas: HTMLCanvasElement, category: string, seed: number): void {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(40, rect.width || canvas.clientWidth || 320);
  const cssH = Math.max(25, rect.height || canvas.clientHeight || Math.round(cssW * 0.625));
  const ss = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1.5) * 1.35;
  const w = Math.round(cssW * ss);
  const h = Math.round(cssH * ss);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#0b0b10');
  bg.addColorStop(0.6, '#060608');
  bg.addColorStop(1, '#030304');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  starfield(ctx, w, h, 130, 0.7);

  const cx = w * 0.5;
  const cy = h * 0.5;
  const R = Math.min(w, h);
  const cat = category || 'Other';
  if (cat === 'Galaxy') {
    drawGalaxy(ctx, cx, cy, R * 0.62, seed, ART_PALETTE.hero);
  } else if (cat === 'Planetary Nebula') {
    drawPlanetaryNebula(ctx, cx, cy, R * 0.42, seed);
  } else if (cat.indexOf('Nebula') !== -1 || cat === 'Supernova Remnant') {
    drawNebulaShell(ctx, cx, cy, R * 0.44, seed);
  } else if (cat === 'Globular Cluster') {
    drawGlobularSwarm(ctx, cx, cy, R * 0.42, seed);
  } else if (cat.indexOf('Cluster') !== -1 || cat === 'Star') {
    drawConstellation(ctx, cx, cy, R * 0.42, seed);
  } else {
    drawOrbits(ctx, cx, cy, R * 0.46, seed);
  }
}

/** Deterministic seed from a target's id + category. */
export function targetArtSeed(id: string, category: string): number {
  const s = `${id}|${category}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h || 7;
}
