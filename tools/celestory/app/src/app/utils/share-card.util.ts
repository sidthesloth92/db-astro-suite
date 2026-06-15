/**
 * Client-side share-card renderer. Paints the Celestory journey to a real
 * <canvas> across 16 named themes and three social formats, then the modals
 * download / copy / share it as a PNG. Faithful port of the design source
 * (`Celestory/js/share-card.jsx`) so the rendered cards match it pixel-for-pixel.
 * Browser-only (Canvas 2D); deterministic backgrounds (seeded PRNG).
 */
import {
  NIGHT_SECONDS,
  SHARE_FILTER_META,
  SHARE_FILTER_ORDER,
  SHARE_FONT_SPECS,
  SHARE_FONTS,
  SHARE_INK,
  type ShareFont,
} from '../models/share-render.constants';
import type {
  ShareActivityNight,
  ShareFilterDistribution,
  ShareFilterKey,
  ShareModel,
  ShareModelEquipment,
  ShareModelObject,
} from '../models/share-model.model';
import type {
  ShareFormatId,
  ShareFormatMeta,
  ShareThemeId,
  ShareThemeMeta,
} from '../models/share.types';
import {
  dayKey,
  daysBetween,
  fmtDate,
  fmtHM,
  fmtHours,
  fmtInt,
  fmtNights,
  fmtRange,
  parseDate,
  yearLabel,
} from './share-format.util';

void NIGHT_SECONDS;

/** A 2D context with the (widely-supported) `letterSpacing` property. */
type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

/** Pixel dimensions of a card. */
interface Dims {
  w: number;
  h: number;
}

/** Slide dimensions, with the scale factor + slide index carried through. */
interface SlideDims extends Dims {
  sc: number;
  index: number;
}

/** A theme's palette + self-contained background painter. */
interface ShareThemeBase {
  label: string;
  swatch: string;
  accent: string;
  gold: string;
  line: string;
  barBg: string;
  lOverride: string;
  heroColor: string;
  glyph: string;
  glyphDot: string;
  scrim?: 'light';
  paint: (ctx: Ctx, w: number, h: number) => void;
}

/** A theme resolved for rendering (palette + fonts + high-contrast ink). */
interface ResolvedTheme extends ShareThemeBase {
  f: ShareFont;
  ink: string;
  sub: string;
}

/** Brand crescent colours (literal, shared with the landing mark). */
const PINK = '#ff2a7b';
const CYAN = '#19e6dd';

// ---- low-level helpers -----------------------------------------------------

/** `#rrggbb`/`#rgb` → `rgba(r,g,b,a)`. */
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Linear interpolation between two `#rrggbb` colours → `rgb(r,g,b)`. */
function lerpHex(a: string, b: string, m: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * m)).join(',')})`;
}

/** Builds a CSS font string, rounding the size. */
function fnt(weight: number | string, px: number, family: string): string {
  return `${weight ? `${weight} ` : ''}${Math.round(px)}px "${family}"`;
}

/** Sets canvas letter-spacing (no-op where unsupported). */
function setLS(ctx: Ctx, px: number): void {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    // unsupported — ignore
  }
}

/** Traces a rounded-rect path (uses native roundRect when available). */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, h / 2, w / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Deterministic PRNG so a given card always looks identical. */
function mkRand(seed: number): () => number {
  let s = seed || 987654321;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A four-lobe sparkle (used by markers + the patch background). */
function vSparkle(ctx: Ctx, cx: number, cy: number, r: number, col: string): void {
  ctx.save();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 0.2, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.2, cy + r * 0.2, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.2, cy + r * 0.2, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.2, cx, cy - r);
  ctx.fill();
  ctx.restore();
}

// ---- formats ---------------------------------------------------------------

/** Social formats keyed by id. */
export const SHARE_FORMATS: Readonly<Record<ShareFormatId, Dims>> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 675 },
};

/** Format-picker metadata. */
export const SHARE_FORMAT_LIST: ShareFormatMeta[] = [
  { id: 'story', label: 'Story', sub: '9:16 · story', w: 1080, h: 1920 },
  { id: 'square', label: 'Square', sub: '1:1 · post', w: 1080, h: 1080 },
  { id: 'landscape', label: 'Landscape', sub: '16:9 · X / OG', w: 1200, h: 675 },
];

// ---- background primitives -------------------------------------------------

/** Radial wash from `color` → transparent across the whole canvas. */
function radialWash(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Scattered white/blue stars (deterministic). */
function starfield(ctx: Ctx, w: number, h: number, count: number, maxAlpha: number): void {
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

/** Connected constellation figures with star dots, in the given colours. */
function constellationsC(
  ctx: Ctx,
  w: number,
  h: number,
  seed: number,
  line: string,
  star: string,
  count: number,
  segMax?: number,
): void {
  const rnd = mkRand(seed);
  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.2;
  for (let c = 0; c < count; c++) {
    let x = rnd() * w;
    let y = rnd() * h;
    const n = 3 + Math.floor(rnd() * (segMax || 3));
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const nx = x + (rnd() - 0.5) * w * 0.22;
      const ny = y + (rnd() - 0.5) * h * 0.16;
      ctx.lineTo(nx, ny);
      ctx.save();
      ctx.fillStyle = star;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.4, 0, 6.283);
      ctx.fill();
      ctx.restore();
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Gold constellation set used by the Starfield theme. */
function goldConstellations(ctx: Ctx, w: number, h: number): void {
  constellationsC(ctx, w, h, 909090, 'rgba(255,217,138,.5)', 'rgba(255,234,190,.95)', 4, 4);
}

/** Curved sky-coordinate graticule. */
function coordGrid(ctx: Ctx, w: number, h: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const cx = w * 0.5;
  const cy = h * 0.46;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    for (let yy = -20; yy <= h + 20; yy += 10) {
      const x = cx + i * (w * 0.15) + Math.sin((yy / h) * Math.PI) * i * (w * 0.03);
      yy < 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let j = -3; j <= 3; j++) {
    ctx.beginPath();
    for (let xx = -20; xx <= w + 20; xx += 10) {
      const y = cy + j * (h * 0.13) + Math.sin((xx / w) * Math.PI) * j * (h * 0.02);
      xx < 0 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Telescope reticle (two rings + crosshair ticks). */
function reticle(ctx: Ctx, cx: number, cy: number, r: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, 6.283);
  ctx.stroke();
  [0, 1.5708, 3.1416, 4.7124].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35);
    ctx.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3);
    ctx.stroke();
  });
  ctx.restore();
}
/** Literal-colour spiral galaxy used by the Galaxy theme background. */
function drawGalaxyBg(ctx: Ctx, cx: number, cy: number, R: number, seed: number): void {
  const rnd = mkRand(seed || 11);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.55);
  ctx.scale(1, 0.52);
  let halo = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  halo.addColorStop(0, 'rgba(200,170,255,0.34)');
  halo.addColorStop(0.42, 'rgba(150,110,230,0.16)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 6.283);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const arms = 2;
  const turns = 2.5;
  const N = 1600;
  for (let a = 0; a < arms; a++) {
    const base = a * Math.PI;
    for (let i = 0; i < N; i++) {
      const tt = i / N;
      const ang = base + tt * turns * 6.283;
      const rad = Math.pow(tt, 0.82) * R * 0.94;
      const spread = (0.03 + 0.11 * tt) * R;
      const px = Math.cos(ang) * rad + (rnd() - 0.5) * spread;
      const py = Math.sin(ang) * rad + (rnd() - 0.5) * spread;
      const br = rnd();
      ctx.globalAlpha = ((1 - tt) * 0.5 + 0.14) * (0.4 + br * 0.6);
      ctx.fillStyle = br > 0.93 ? '#ff8fd4' : br > 0.62 ? '#aecbff' : '#ffffff';
      const sr = (br > 0.97 ? 2.6 : 0.9) + rnd() * 1.3;
      ctx.beginPath();
      ctx.arc(px, py, sr, 0, 6.283);
      ctx.fill();
    }
  }
  for (let i = 0; i < 26; i++) {
    const a = (i % 2) * Math.PI;
    const tt = 0.18 + rnd() * 0.78;
    const ang = a + tt * turns * 6.283;
    const rad = Math.pow(tt, 0.82) * R * 0.9;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    const cr = R * (0.07 + rnd() * 0.1);
    const g = ctx.createRadialGradient(px, py, 0, px, py, cr);
    g.addColorStop(0, rnd() > 0.7 ? 'rgba(255,150,220,0.18)' : 'rgba(150,190,255,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, cr, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.36);
  core.addColorStop(0, 'rgba(255,250,232,0.98)');
  core.addColorStop(0.22, 'rgba(255,228,180,0.78)');
  core.addColorStop(0.55, 'rgba(232,150,255,0.32)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.36, 0, 6.283);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/** Literal-colour black hole + accretion disk for the Black Hole theme. */
function drawBlackHoleBg(ctx: Ctx, cx: number, cy: number, R: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
  g.addColorStop(0, 'rgba(255,150,60,0.20)');
  g.addColorStop(0.45, 'rgba(255,90,40,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R * 1.9, cy - R * 1.9, R * 3.8, R * 3.8);
  ctx.translate(cx, cy);
  ctx.rotate(-0.28);
  for (let i = 47; i >= 0; i--) {
    const tt = i / 47;
    const rx = R * (0.5 + 0.78 * tt);
    const ry = rx * 0.3;
    const col = tt < 0.5 ? lerpHex('#fff2d0', '#ff9b3d', tt * 2) : lerpHex('#ff9b3d', '#7a1e08', (tt - 0.5) * 2);
    ctx.strokeStyle = col;
    ctx.globalAlpha = (1 - tt) * 0.5 + 0.08;
    ctx.lineWidth = R * 0.055;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, 6.283);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,180,90,0.62)';
  ctx.lineWidth = R * 0.07;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.84, R * 0.5, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
  ctx.fillStyle = '#040409';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.46, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,150,0.95)';
  ctx.lineWidth = R * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.48, 0, 6.283);
  ctx.stroke();
  ctx.restore();
}

/** Vector aurora curtains for the Aurora theme. */
function drawAuroraCurtains(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 13);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#221045');
  sky.addColorStop(0.42, '#2c1955');
  sky.addColorStop(0.8, '#1a1e44');
  sky.addColorStop(1, '#0a1626');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  radialWash(ctx, w * 0.02, h * 0.62, Math.max(w, h) * 0.6, 'rgba(45,170,180,.26)');
  const p1 = rnd() * 6.283;
  const p2 = rnd() * 6.283;
  const p3 = rnd() * 6.283;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const cols = 150;
  const lw = (w / cols) * 2.6;
  for (let i = 0; i <= cols; i++) {
    const tx = i / cols;
    const x = tx * w;
    let n = 0.5 + 0.34 * Math.sin(tx * 9 + p1) + 0.26 * Math.sin(tx * 21.5 + p2) + 0.16 * Math.sin(tx * 43 + p3);
    n = Math.max(0, Math.min(1, n));
    const inten = Math.pow(n, 2.1) * 0.9 + 0.04;
    const green = Math.pow(Math.max(0, Math.sin((tx - 0.18) * 3.4)), 2) * 0.8 + (tx > 0.8 ? 0.3 : 0);
    const y0 = h * (0.02 + rnd() * 0.1);
    const y1 = h * (0.97 - rnd() * 0.05);
    const xb = x + (tx - 0.5) * w * 0.14 + Math.sin(tx * 31 + p2) * w * 0.012;
    const g = ctx.createLinearGradient(x, y0, xb, y1);
    g.addColorStop(0, 'rgba(140,90,220,0)');
    g.addColorStop(0.22, `rgba(150,95,225,${(inten * 0.22).toFixed(3)})`);
    g.addColorStop(0.48, `rgba(255,125,200,${(inten * 0.42).toFixed(3)})`);
    g.addColorStop(0.66, `rgba(255,224,186,${(inten * 0.5).toFixed(3)})`);
    g.addColorStop(0.84, `rgba(110,240,165,${(inten * (0.18 + green * 0.42)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(60,200,140,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(xb, y1);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(w * 0.52, h * 0.88, 0, w * 0.52, h * 0.88, Math.max(w, h) * 0.4);
  glow.addColorStop(0, 'rgba(255,225,185,.22)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Billowing gas-cloud nebula field used by the Nebula theme. */
function drawNebulaField(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 7);
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#1a0633');
  base.addColorStop(0.5, '#100620');
  base.addColorStop(1, '#070310');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const D = Math.max(w, h);
  const cloud = (cxf: number, cyf: number, rf: number, col: string, alpha: number): void => {
    const x = w * cxf;
    const y = h * cyf;
    const r = D * rf;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(col, alpha));
    g.addColorStop(0.5, hexA(col, alpha * 0.42));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  const palette = ['#ff3d9a', '#b13dff', '#3d6bff', '#19d3c9', '#ff7a3d', '#ff2a7b'];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  cloud(0.3, 0.4, 0.58, '#7a1fd0', 0.6);
  cloud(0.62, 0.56, 0.52, '#ff2a7b', 0.42);
  cloud(0.5, 0.28, 0.44, '#3d6bff', 0.34);
  cloud(0.74, 0.72, 0.42, '#19d3c9', 0.3);
  cloud(0.2, 0.7, 0.4, '#b13dff', 0.36);
  cloud(0.86, 0.2, 0.34, '#ff7a3d', 0.24);
  for (let i = 0; i < 130; i++) {
    cloud(0.1 + rnd() * 0.82, 0.14 + rnd() * 0.72, 0.04 + rnd() * 0.13, palette[(rnd() * palette.length) | 0], 0.05 + rnd() * 0.13);
  }
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 11; i++) {
    const x = w * (0.12 + rnd() * 0.76);
    const y = h * (0.18 + rnd() * 0.6);
    const r = D * (0.05 + rnd() * 0.14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(7,3,16,${(0.26 + rnd() * 0.3).toFixed(2)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 44; i++) {
    const x = w * rnd();
    const y = h * rnd();
    const r = 2 + rnd() * 9;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,180,230,0.5)' : 'rgba(180,220,255,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
  starfield(ctx, w, h, 230, 0.95);
}
/** Telescope schematic — refractor drawn in thin blueprint lines. */
function drawBlueprintBg(ctx: Ctx, w: number, h: number, col: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha * 0.4;
  const step = Math.max(w, h) / 22;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  const cx = w * 0.5;
  const cy = h * 0.52;
  const L = Math.min(w, h) * 0.62;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.translate(cx, cy);
  ctx.rotate(-0.46);
  const tubeW = L * 0.26;
  roundRect(ctx, -L * 0.5, -tubeW / 2, L, tubeW, tubeW * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(L * 0.5, 0, tubeW * 0.16, tubeW / 2, 0, 0, 6.283);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-L * 0.5, 0, tubeW * 0.14, tubeW * 0.42, 0, 0, 6.283);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(L * 0.5, -tubeW / 2);
  ctx.lineTo(L * 0.62, -tubeW * 0.42);
  ctx.moveTo(L * 0.5, tubeW / 2);
  ctx.lineTo(L * 0.62, tubeW * 0.42);
  ctx.stroke();
  roundRect(ctx, -L * 0.62, -tubeW * 0.16, L * 0.12, tubeW * 0.32, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-L * 0.56, tubeW * 0.34, tubeW * 0.07, 0, 6.283);
  ctx.stroke();
  roundRect(ctx, -L * 0.06, -tubeW * 0.72, L * 0.3, tubeW * 0.16, 4);
  ctx.stroke();
  [-0.16, 0.18].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(L * f, -tubeW / 2 - 6);
    ctx.lineTo(L * f, tubeW / 2 + 6);
    ctx.stroke();
  });
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + L * 0.16);
  ctx.lineTo(cx - L * 0.22, cy + L * 0.5);
  ctx.moveTo(cx, cy + L * 0.16);
  ctx.lineTo(cx + L * 0.22, cy + L * 0.5);
  ctx.moveTo(cx, cy + L * 0.16);
  ctx.lineTo(cx + L * 0.02, cy + L * 0.52);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.8;
  [[w * 0.5, h * 0.16], [w * 0.84, h * 0.8]].forEach((p) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 9, 0, 6.283);
    ctx.moveTo(p[0] - 16, p[1]);
    ctx.lineTo(p[0] + 16, p[1]);
    ctx.moveTo(p[0], p[1] - 16);
    ctx.lineTo(p[0], p[1] + 16);
    ctx.stroke();
  });
  ctx.restore();
}

/** Celestial coordinate atlas — RA/Dec graticule + constellation lines. */
function drawAtlasBg(ctx: Ctx, w: number, h: number, col: string, star: string, alpha: number, seed: number): void {
  const rnd = mkRand(seed || 41);
  ctx.save();
  const cx = w * 0.46;
  const cy = h * 1.18;
  const baseR = Math.max(w, h) * 0.62;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = alpha;
  for (let i = 1; i <= 7; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * (0.5 + i * 0.16), Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  for (let j = -5; j <= 5; j++) {
    const a = -Math.PI / 2 + j * 0.16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * baseR * 0.55, cy + Math.sin(a) * baseR * 0.55);
    ctx.lineTo(cx + Math.cos(a) * baseR * 1.62, cy + Math.sin(a) * baseR * 1.62);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * 1.3;
  ctx.strokeStyle = col;
  for (let c = 0; c < 4; c++) {
    let x = w * (0.12 + rnd() * 0.76);
    let y = h * (0.1 + rnd() * 0.62);
    const n = 3 + ((rnd() * 3) | 0);
    const pts = [{ x, y }];
    for (let k = 0; k < n; k++) {
      x += (rnd() - 0.5) * w * 0.2;
      y += (rnd() - 0.5) * h * 0.16;
      pts.push({ x, y });
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.fillStyle = star;
      ctx.globalAlpha = alpha * (i === 0 ? 2.2 : 1.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 3.4 : 2.2, 0, 6.283);
      ctx.fill();
    });
    ctx.globalAlpha = alpha * 1.3;
  }
  ctx.restore();
}

/** Eclipse — black sun, blazing corona. */
function drawEclipseBg(ctx: Ctx, cx: number, cy: number, R: number): void {
  ctx.save();
  let g = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 3.4);
  g.addColorStop(0, 'rgba(240,240,255,0.5)');
  g.addColorStop(0.3, 'rgba(200,200,230,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 3.4, 0, 6.283);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const rnd = mkRand(5);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 6.283;
    const len = R * (1.5 + rnd() * 1.7);
    const wdt = 0.05 + rnd() * 0.1;
    const sg = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, len);
    sg.addColorStop(0, `rgba(235,235,255,${(0.1 + rnd() * 0.16).toFixed(2)})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, len, a - wdt, a + wdt);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = R * 0.045;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 6.283);
  ctx.stroke();
  ctx.fillStyle = '#050507';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.985, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** Milky Way — diagonal star-cloud band with warm core and dust rifts. */
function drawMilkyWayBg(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 19);
  const D = Math.max(w, h);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.rotate(-0.62);
  ctx.translate(-w * 0.5, -h * 0.5);
  const band = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.74);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, 'rgba(196,170,130,0.30)');
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-D, h * 0.26, w + 2 * D, h * 0.52);
  const core = ctx.createRadialGradient(w * 0.62, h * 0.52, 0, w * 0.62, h * 0.52, D * 0.34);
  core.addColorStop(0, 'rgba(255,205,140,0.42)');
  core.addColorStop(0.5, 'rgba(220,165,110,0.16)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(-D, 0, w + 2 * D, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2200; i++) {
    const x = -D * 0.2 + rnd() * (w + D * 0.4);
    const yC = h * 0.52 + (rnd() + rnd() + rnd() - 1.5) * h * 0.13;
    const br = rnd();
    ctx.globalAlpha = 0.12 + br * 0.5;
    ctx.fillStyle = br > 0.9 ? '#ffe2b8' : '#fff8ee';
    ctx.fillRect(x, yC, 0.8 + br * 1.6, 0.8 + br * 1.6);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 14; i++) {
    const x = -D * 0.1 + rnd() * (w + D * 0.2);
    const y = h * (0.44 + rnd() * 0.16);
    const rx = D * (0.05 + rnd() * 0.13);
    const ry = rx * (0.22 + rnd() * 0.2);
    const dg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    dg.addColorStop(0, `rgba(8,6,14,${(0.4 + rnd() * 0.3).toFixed(2)})`);
    dg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(x, y, rx, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Comet — bright head upper-right, ion + dust tails sweeping down-left. */
function drawCometBg(ctx: Ctx, w: number, h: number): void {
  const hx = w * 0.78;
  const hy = h * 0.22;
  const D = Math.max(w, h);
  const ang = Math.atan2(h * 0.95 - hy, w * 0.05 - hx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const a2 = ang + 0.16 + i * 0.1;
    const len = D * (0.6 + i * 0.12);
    const tg = ctx.createLinearGradient(hx, hy, hx + Math.cos(a2) * len, hy + Math.sin(a2) * len);
    tg.addColorStop(0, 'rgba(225,238,248,0.30)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(hx, hy, len, a2 - 0.07 - i * 0.04, a2 + 0.07 + i * 0.04);
    ctx.closePath();
    ctx.fill();
  }
  const rnd = mkRand(9);
  for (let i = 0; i < 7; i++) {
    const a2 = ang - 0.05 + (rnd() - 0.5) * 0.07;
    const len = D * (0.55 + rnd() * 0.4);
    const tg = ctx.createLinearGradient(hx, hy, hx + Math.cos(a2) * len, hy + Math.sin(a2) * len);
    tg.addColorStop(0, `rgba(110,225,255,${(0.22 + rnd() * 0.2).toFixed(2)})`);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = 1.5 + rnd() * 3;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + Math.cos(a2) * len * 0.5, hy + Math.sin(a2) * len * 0.5 + rnd() * 20, hx + Math.cos(a2) * len, hy + Math.sin(a2) * len);
    ctx.stroke();
  }
  const cg = ctx.createRadialGradient(hx, hy, 0, hx, hy, D * 0.09);
  cg.addColorStop(0, 'rgba(255,255,255,0.95)');
  cg.addColorStop(0.25, 'rgba(190,240,255,0.5)');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(hx, hy, D * 0.09, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** Deep Field — dozens of tiny faint galaxies instead of stars. */
function drawDeepFieldBg(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 27);
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const x = w * rnd();
    const y = h * rnd();
    const big = rnd();
    const r = (2.5 + big * big * 16) * Math.max(w, h) / 1080;
    const warm = rnd() > 0.45;
    const col = warm ? '255,214,170' : rnd() > 0.5 ? '170,200,255' : '220,190,255';
    const a = 0.1 + big * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * 6.283);
    ctx.scale(1, 0.25 + rnd() * 0.65);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${col},${Math.min(0.9, a + 0.35).toFixed(2)})`);
    g.addColorStop(0.4, `rgba(${col},${a.toFixed(2)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 4; i++) {
    const x = w * rnd();
    const y = h * rnd();
    const r = 2 + rnd() * 3;
    ctx.fillStyle = 'rgba(255,250,240,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,240,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - r * 6, y);
    ctx.lineTo(x + r * 6, y);
    ctx.moveTo(x, y - r * 6);
    ctx.lineTo(x, y + r * 6);
    ctx.stroke();
  }
  ctx.restore();
}

/** Film Negative — paper-light frame with sprocket holes and dark star specks. */
function drawFilmNegBg(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 33);
  const sc = Math.max(w, h) / 1080;
  ctx.fillStyle = '#e9e4da';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(60,52,40,${(0.02 + rnd() * 0.05).toFixed(3)})`;
    ctx.fillRect(w * rnd(), h * rnd(), 1.4 * sc, 1.4 * sc);
  }
  for (let i = 0; i < 240; i++) {
    const r = (0.6 + rnd() * 1.8) * sc;
    ctx.fillStyle = `rgba(34,29,21,${(0.16 + rnd() * 0.5).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(w * rnd(), h * rnd(), r, 0, 6.283);
    ctx.fill();
  }
  const eh = 54 * sc;
  ctx.fillStyle = '#15120d';
  ctx.fillRect(0, 0, w, eh);
  ctx.fillRect(0, h - eh, w, eh);
  const hw = 30 * sc;
  const hh = 22 * sc;
  const gap = 64 * sc;
  ctx.fillStyle = '#e9e4da';
  for (let x = gap / 2; x < w - hw; x += gap) {
    roundRect(ctx, x, (eh - hh) / 2, hw, hh, 5 * sc);
    ctx.fill();
    roundRect(ctx, x, h - eh + (eh - hh) / 2, hw, hh, 5 * sc);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(233,228,218,0.85)';
  ctx.font = `600 ${Math.round(15 * sc)}px "IBM Plex Mono"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CELESTORY PAN 400', 10 * sc, h - eh / 2);
  ctx.textAlign = 'right';
  ctx.fillText('▸ 36A', w - 10 * sc, h - eh / 2);
  ctx.textAlign = 'left';
}

/** Observer's Log — ruled ledger paper with margin line and stamp. */
function drawObsLogBg(ctx: Ctx, w: number, h: number): void {
  const sc = Math.max(w, h) / 1080;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#f0e7d2');
  g.addColorStop(0.55, '#eadfc4');
  g.addColorStop(1, '#e2d4b4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(120,90,40,0.13)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(90,110,140,0.22)';
  ctx.lineWidth = 1.2 * sc;
  const step = 56 * sc;
  for (let y = step * 2.4; y < h - step * 0.6; y += step) {
    ctx.beginPath();
    ctx.moveTo(w * 0.045, y);
    ctx.lineTo(w * 0.955, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(163,61,42,0.4)';
  ctx.lineWidth = 1.6 * sc;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.04);
  ctx.lineTo(w * 0.1, h * 0.96);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,46,30,0.16)';
  [0.25, 0.5, 0.75].forEach((f) => {
    ctx.beginPath();
    ctx.arc(w * 0.035, h * f, 11 * sc, 0, 6.283);
    ctx.fill();
  });
  ctx.save();
  ctx.translate(w * 0.84, h * 0.88);
  ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(163,61,42,0.35)';
  ctx.lineWidth = 2.2 * sc;
  ctx.beginPath();
  ctx.arc(0, 0, 64 * sc, 0, 6.283);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 52 * sc, 0, 6.283);
  ctx.stroke();
  ctx.fillStyle = 'rgba(163,61,42,0.4)';
  ctx.font = `700 ${Math.round(15 * sc)}px "IBM Plex Mono"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VERIFIED', 0, -8 * sc);
  ctx.fillText('CLEAR SKY', 0, 12 * sc);
  ctx.restore();
  ctx.textAlign = 'left';
}

/** Mission Patch — flat retro screen-print: banded sky, planet horizon. */
function drawPatchBg(ctx: Ctx, w: number, h: number): void {
  const sc = Math.max(w, h) / 1080;
  ctx.fillStyle = '#1c2c52';
  ctx.fillRect(0, 0, w, h);
  const sx = w * 0.74;
  const sy = h * 0.26;
  ctx.fillStyle = '#27355e';
  ctx.beginPath();
  ctx.arc(sx, sy, 190 * sc, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#324273';
  ctx.beginPath();
  ctx.arc(sx, sy, 132 * sc, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(sx, sy, 84 * sc, 0, 6.283);
  ctx.fill();
  const rnd = mkRand(3);
  for (let i = 0; i < 26; i++) {
    const x = w * rnd();
    const y = h * rnd() * 0.72;
    const r = (2.5 + rnd() * 4.5) * sc;
    vSparkle(ctx, x, y, r, '#f5ead0');
  }
  const cy2 = h * 1.75;
  const layers: [string, number][] = [
    ['#b8472e', h * 0.62],
    ['#d96a3b', h * 0.665],
    ['#ff8c42', h * 0.71],
    ['#27355e', h * 0.755],
    ['#1a2440', h * 0.8],
  ];
  layers.forEach((L) => {
    ctx.fillStyle = L[0];
    ctx.beginPath();
    ctx.arc(w * 0.5, cy2, cy2 - L[1], 0, 6.283);
    ctx.fill();
  });
  ctx.save();
  ctx.translate(w * 0.5, h * 0.78);
  ctx.rotate(-0.06);
  ctx.strokeStyle = 'rgba(245,234,208,0.55)';
  ctx.lineWidth = 2.4 * sc;
  ctx.setLineDash([10 * sc, 8 * sc]);
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.42, h * 0.1, 0, 0, 6.283);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f5ead0';
  ctx.beginPath();
  ctx.arc(w * 0.42 * Math.cos(2.6), h * 0.1 * Math.sin(2.6), 7 * sc, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** Moonlight — bright moon with halo, silver-blue sky, cloud wisps. */
function drawMoonlightBg(ctx: Ctx, w: number, h: number, seed: number): void {
  const rnd = mkRand(seed || 47);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1b2a4a');
  g.addColorStop(0.55, '#16223c');
  g.addColorStop(1, '#0c1426');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  starfield(ctx, w, h, 130, 0.7);
  const mx = w * 0.72;
  const my = h * 0.2;
  const mr = Math.min(w, h) * 0.085;
  const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
  halo.addColorStop(0, 'rgba(214,228,255,0.5)');
  halo.addColorStop(0.35, 'rgba(170,195,240,0.14)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 6, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,218,255,0.16)';
  ctx.lineWidth = mr * 0.5;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 3.4, 0, 6.283);
  ctx.stroke();
  ctx.fillStyle = '#f0f3f8';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, 6.283);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, 6.283);
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.283;
    const rr = rnd() * mr * 0.75;
    ctx.fillStyle = `rgba(150,165,190,${(0.18 + rnd() * 0.2).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(mx + Math.cos(a) * rr, my + Math.sin(a) * rr, mr * (0.1 + rnd() * 0.24), 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const x = w * rnd();
    const y = h * (0.1 + rnd() * 0.75);
    const rx = w * (0.14 + rnd() * 0.2);
    const ry = rx * 0.16;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    const near = Math.hypot(x - mx, y - my) < w * 0.3;
    cg.addColorStop(0, `rgba(${near ? '210,224,250' : '160,178,210'},${(0.1 + rnd() * 0.1).toFixed(2)})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, rx, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
}
// ---- themes ----------------------------------------------------------------

/** The 16 named share-card themes (palette + self-contained background painter). */
const SHARE_THEMES: Readonly<Record<ShareThemeId, ShareThemeBase>> = {
  dark: {
    label: 'Observatory',
    swatch: 'linear-gradient(140deg,#0a0e16,#05070c 70%)',
    accent: '#34e3d0', gold: '#e7c07b', line: 'rgba(150,170,210,.16)', barBg: 'rgba(150,170,210,.10)',
    lOverride: '#e9edf4', heroColor: '#34e3d0', glyph: '#34e3d0', glyphDot: '#e7c07b',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
      g.addColorStop(0, '#0a0f18'); g.addColorStop(0.55, '#070a11'); g.addColorStop(1, '#05070c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      radialWash(ctx, w * 0.82, h * 0.04, Math.max(w, h) * 0.7, 'rgba(52,227,208,.10)');
      radialWash(ctx, w * 0.06, h * 0.1, Math.max(w, h) * 0.6, 'rgba(120,92,220,.10)');
      coordGrid(ctx, w, h, '#5fb9c0', 0.07);
      reticle(ctx, w * 0.8, h * 0.19, Math.min(w, h) * 0.12, '#34e3d0', 0.16);
      starfield(ctx, w, h, 80, 0.45);
    },
  },
  star: {
    label: 'Starfield',
    swatch: 'linear-gradient(140deg,#262a64,#0a0b22 78%)',
    accent: '#ffd98a', gold: '#ffd98a', line: 'rgba(200,196,240,.2)', barBg: 'rgba(200,196,240,.13)',
    lOverride: '#f0eeff', heroColor: '#ffd98a', glyph: '#ffd98a', glyphDot: '#b9a6ff',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
      g.addColorStop(0, '#1f2358'); g.addColorStop(0.5, '#13153a'); g.addColorStop(1, '#080a1e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      radialWash(ctx, w * 0.72, h * 0.1, Math.max(w, h) * 0.6, 'rgba(120,110,235,.22)');
      goldConstellations(ctx, w, h);
      starfield(ctx, w, h, 240, 0.98);
    },
  },
  astro: {
    label: 'Nebula',
    swatch: 'linear-gradient(140deg,#b0269a,#3a1170 55%,#10081f)',
    accent: '#ff6ad5', gold: '#ffd36a', line: 'rgba(240,200,245,.22)', barBg: 'rgba(240,200,245,.15)',
    lOverride: '#fdeffb', heroColor: '#6cf0e0', glyph: '#ff6ad5', glyphDot: '#6cf0e0',
    paint: (ctx, w, h) => {
      drawNebulaField(ctx, w, h, 7);
    },
  },
  galaxy: {
    label: 'Galaxy',
    swatch: 'linear-gradient(140deg,#8a45f0,#2a1450 58%,#0a0618)',
    accent: '#c98bff', gold: '#ffce6b', line: 'rgba(210,180,255,.20)', barBg: 'rgba(210,180,255,.12)',
    lOverride: '#efe6ff', heroColor: '#d6a8ff', glyph: '#c98bff', glyphDot: '#ffce6b',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#2a1450'); g.addColorStop(0.55, '#150a2e'); g.addColorStop(1, '#070312');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      radialWash(ctx, w * 0.68, h * 0.34, Math.max(w, h) * 0.7, 'rgba(150,90,255,.30)');
      radialWash(ctx, w * 0.18, h * 0.84, Math.max(w, h) * 0.5, 'rgba(255,150,90,.14)');
      starfield(ctx, w, h, 180, 0.92);
      drawGalaxyBg(ctx, w * 0.64, h * 0.4, Math.min(w, h) * 0.62, 14);
    },
  },
  blackhole: {
    label: 'Black Hole',
    swatch: 'radial-gradient(circle at 50% 44%,#ffb24d,#7a1e08 42%,#05050a 74%)',
    accent: '#ff9b3d', gold: '#ffd98a', line: 'rgba(255,180,120,.18)', barBg: 'rgba(255,180,120,.10)',
    lOverride: '#ffe8cf', heroColor: '#ffb24d', glyph: '#ff9b3d', glyphDot: '#ffd98a',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0c0a12'); g.addColorStop(0.5, '#08060e'); g.addColorStop(1, '#040409');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h, 150, 0.8);
      drawBlackHoleBg(ctx, w * 0.5, h * 0.42, Math.min(w, h) * 0.34);
    },
  },
  aurora: {
    label: 'Aurora',
    swatch: 'linear-gradient(180deg,#2c1656,#ff8fd0 58%,#5fe8a0)',
    accent: '#5fffc2', gold: '#ffc7ec', line: 'rgba(220,180,240,.22)', barBg: 'rgba(220,180,240,.12)',
    lOverride: '#f7e9ff', heroColor: '#ff9fd8', glyph: '#5fffc2', glyphDot: '#ff9fd8',
    paint: (ctx, w, h) => {
      drawAuroraCurtains(ctx, w, h, 13);
      starfield(ctx, w, h, 210, 0.9);
    },
  },
  blueprint: {
    label: 'Blueprint',
    swatch: 'linear-gradient(140deg,#10519e,#0a2350 58%,#030c20)',
    accent: '#6cc6ff', gold: '#ffd98a', line: 'rgba(150,200,255,.24)', barBg: 'rgba(150,200,255,.12)',
    lOverride: '#eaf4ff', heroColor: '#7fd4ff', glyph: '#6cc6ff', glyphDot: '#ffd98a',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#0c2c63'); g.addColorStop(0.55, '#081b40'); g.addColorStop(1, '#030c1f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      drawBlueprintBg(ctx, w, h, 'rgba(165,212,255,0.7)', 0.62);
      starfield(ctx, w, h, 90, 0.5);
    },
  },
  atlas: {
    label: 'Star Atlas',
    swatch: 'linear-gradient(140deg,#2b3a72,#141a3c 58%,#080a1a)',
    accent: '#e7c07b', gold: '#ffd98a', line: 'rgba(231,192,123,.26)', barBg: 'rgba(231,192,123,.13)',
    lOverride: '#fbf3e3', heroColor: '#ffd98a', glyph: '#e7c07b', glyphDot: '#9fc6ff',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1c2550'); g.addColorStop(0.55, '#10142f'); g.addColorStop(1, '#070a18');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      drawAtlasBg(ctx, w, h, 'rgba(235,198,135,0.58)', 'rgba(255,242,214,0.98)', 0.62, 41);
      starfield(ctx, w, h, 120, 0.7);
    },
  },
  eclipse: {
    label: 'Eclipse',
    swatch: 'radial-gradient(circle at 50% 42%,#0a0a10 0 26%,#fff 27% 31%,#3a3a4a 45%,#0a0a10 70%)',
    accent: '#e6e6f0', gold: '#cfcfdc', line: 'rgba(220,220,235,.20)', barBg: 'rgba(220,220,235,.10)',
    lOverride: '#f0f0f6', heroColor: '#ffffff', glyph: '#e6e6f0', glyphDot: '#9d9dad',
    paint: (ctx, w, h) => {
      ctx.fillStyle = '#08080d'; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h, 110, 0.55);
      drawEclipseBg(ctx, w * 0.5, h * 0.4, Math.min(w, h) * 0.21);
    },
  },
  milkyway: {
    label: 'Milky Way',
    swatch: 'linear-gradient(135deg,#0b1026,#caa36b 48%,#3a2a4a 60%,#0b1026)',
    accent: '#ffc06b', gold: '#ffd98a', line: 'rgba(255,200,140,.20)', barBg: 'rgba(255,200,140,.10)',
    lOverride: '#ffeed2', heroColor: '#ffd9a0', glyph: '#ffc06b', glyphDot: '#9fc6ff',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a0e24'); g.addColorStop(1, '#070514');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h, 160, 0.8);
      drawMilkyWayBg(ctx, w, h, 19);
    },
  },
  comet: {
    label: 'Comet',
    swatch: 'linear-gradient(225deg,#bff3ff,#1d8cb8 28%,#0a1a30 75%)',
    accent: '#5fd8ff', gold: '#bfeec9', line: 'rgba(130,210,245,.22)', barBg: 'rgba(130,210,245,.11)',
    lOverride: '#dff4ff', heroColor: '#8fe8ff', glyph: '#5fd8ff', glyphDot: '#bfeec9',
    paint: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#08182e'); g.addColorStop(1, '#050a18');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      starfield(ctx, w, h, 170, 0.85);
      drawCometBg(ctx, w, h);
    },
  },
  deepfield: {
    label: 'Deep Field',
    swatch: 'radial-gradient(circle at 30% 30%,#caa9ff 0 6%,transparent 7%),radial-gradient(circle at 68% 60%,#ffd9b0 0 5%,transparent 6%),radial-gradient(circle at 55% 25%,#9fc6ff 0 4%,transparent 5%),#06060a',
    accent: '#d8b9ff', gold: '#ffd9b0', line: 'rgba(216,185,255,.18)', barBg: 'rgba(216,185,255,.09)',
    lOverride: '#efe9dd', heroColor: '#f0e6d8', glyph: '#d8b9ff', glyphDot: '#ffd9b0',
    paint: (ctx, w, h) => {
      ctx.fillStyle = '#050509'; ctx.fillRect(0, 0, w, h);
      drawDeepFieldBg(ctx, w, h, 27);
      starfield(ctx, w, h, 40, 0.5);
    },
  },
  filmneg: {
    label: 'Film Negative',
    scrim: 'light',
    swatch: 'linear-gradient(180deg,#111 0 12%,#e9e4da 12% 88%,#111 88%)',
    accent: '#c2452b', gold: '#8c6b2f', line: 'rgba(45,38,28,.28)', barBg: 'rgba(45,38,28,.08)',
    lOverride: '#2a2620', heroColor: '#b03a22', glyph: '#c2452b', glyphDot: '#221d15',
    paint: (ctx, w, h) => {
      drawFilmNegBg(ctx, w, h, 33);
    },
  },
  obslog: {
    label: 'Observer’s Log',
    scrim: 'light',
    swatch: 'repeating-linear-gradient(180deg,#efe5cf 0 10px,#e2d5b8 10px 11px)',
    accent: '#a33d2a', gold: '#8c6b2f', line: 'rgba(60,46,30,.30)', barBg: 'rgba(60,46,30,.08)',
    lOverride: '#3a2f20', heroColor: '#a33d2a', glyph: '#a33d2a', glyphDot: '#2a2118',
    paint: (ctx, w, h) => {
      drawObsLogBg(ctx, w, h);
    },
  },
  patch: {
    label: 'Mission Patch',
    swatch: 'linear-gradient(180deg,#1c2c52 0 55%,#ff8c42 55% 70%,#b8472e 70% 85%,#27355e 85%)',
    accent: '#ff8c42', gold: '#ffd23f', line: 'rgba(245,234,208,.25)', barBg: 'rgba(245,234,208,.12)',
    lOverride: '#f5ead0', heroColor: '#ffd23f', glyph: '#ff8c42', glyphDot: '#ffd23f',
    paint: (ctx, w, h) => {
      drawPatchBg(ctx, w, h);
    },
  },
  moonlight: {
    label: 'Moonlight',
    swatch: 'radial-gradient(circle at 68% 26%,#fff 0 9%,#9db8e8 22%,#34507e 55%,#101c33)',
    accent: '#bcd4ff', gold: '#e8e3c8', line: 'rgba(190,212,255,.22)', barBg: 'rgba(190,212,255,.11)',
    lOverride: '#e8f0ff', heroColor: '#dfe9ff', glyph: '#bcd4ff', glyphDot: '#e8e3c8',
    paint: (ctx, w, h) => {
      drawMoonlightBg(ctx, w, h, 47);
    },
  },
};

/** Theme render + picker order. */
const THEME_ORDER: readonly ShareThemeId[] = [
  'dark', 'star', 'astro', 'galaxy', 'blackhole', 'aurora', 'blueprint', 'atlas',
  'eclipse', 'milkyway', 'comet', 'deepfield', 'filmneg', 'obslog', 'patch', 'moonlight',
];

/** Theme-picker metadata (named, with a CSS swatch). */
export const SHARE_THEME_LIST: ShareThemeMeta[] = THEME_ORDER.map((id) => ({
  id,
  label: SHARE_THEMES[id].label,
  swatch: SHARE_THEMES[id].swatch,
}));

/** Resolves a theme id to a render-ready theme (palette + fonts + ink). */
function resolveTheme(id: ShareThemeId): ResolvedTheme {
  const base = SHARE_THEMES[id] ?? SHARE_THEMES.dark;
  const ink = SHARE_INK[id] ?? SHARE_INK.dark;
  return { ...base, f: SHARE_FONTS[id] ?? SHARE_FONTS.dark, ink: ink.ink, sub: ink.sub, label: ink.label };
}

/** Signature colour for a filter key, honouring the theme's L override. */
function filterColor(k: ShareFilterKey, t: ResolvedTheme): string {
  if (k === 'L' && t.lOverride) {
    return t.lOverride;
  }
  return SHARE_FILTER_META[k].color;
}

/** Filtered, ordered list of filter keys present in a distribution. */
function presentFilters(dist: ShareFilterDistribution): ShareFilterKey[] {
  return SHARE_FILTER_ORDER.filter((k) => (dist[k] ?? 0) > 0);
}
// ---- chrome ----------------------------------------------------------------

/** Brand crescent mark — canvas port of the header / landing logo. */
function drawGlyph(ctx: Ctx, cx: number, cy: number, r: number): void {
  const size = r * 2.2;
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  const k = size / 100;
  const dot = 0.62;
  let sd = 7;
  const rnd = (): number => {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    return sd / 0x7fffffff;
  };
  const bx = 60;
  const by = 60;
  const br = 46;
  const gap = br * 0.16818 * dot;
  const s = br * 0.12273 * dot;
  const cr = br * 0.90909;
  const ccx = bx + br * 0.45455;
  const ccy = by - br * 0.27273;
  const gx = bx - br - 2;
  const gy = by - br - 4;
  const cols = Math.ceil((br * 2 + 8) / gap);
  const rows = Math.ceil((br * 2 + 8) / gap);
  ctx.save();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = gx + col * gap;
      const py = gy + row * gap;
      const mx = px + s / 2;
      const my = py + s / 2;
      if (Math.hypot(mx - bx, my - by) <= br && Math.hypot(mx - ccx, my - ccy) > cr) {
        const v = rnd();
        const lit = v > 0.22;
        ctx.fillStyle = lit ? lerpHex(CYAN, PINK, v) : 'rgba(170,160,200,0.16)';
        ctx.globalAlpha = lit ? 0.55 + v * 0.45 : 1;
        roundRect(ctx, x0 + (px - 10) * k, y0 + (py - 10) * k, s * k, s * k, s * 0.26 * k);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Dual-colour "Celestory" wordmark — "Cele" ink + "story" accent. */
function drawWordmark(ctx: Ctx, x: number, y: number, t: ResolvedTheme): number {
  const a = ctx.textAlign;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.ink;
  ctx.fillText('Cele', x, y);
  const w1 = ctx.measureText('Cele').width;
  ctx.fillStyle = t.accent;
  ctx.fillText('story', x + w1, y);
  ctx.textAlign = a;
  return w1 + ctx.measureText('story').width;
}

/** Darkening (or lightening for paper themes) scrim so text reads over art. */
function scrim(ctx: Ctx, w: number, h: number, t: ResolvedTheme): void {
  if (t.scrim === 'light') {
    ctx.fillStyle = 'rgba(249,246,239,0.20)';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(5,6,12,0.32)');
  g.addColorStop(0.5, 'rgba(5,6,12,0.46)');
  g.addColorStop(1, 'rgba(5,6,12,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Themes whose background art is bright/busy enough to fight chart-dense cards. */
const BUSY_THEMES: Readonly<Record<string, 1>> = {
  nebula: 1, galaxy: 1, blackhole: 1, aurora: 1, milkyway: 1, comet: 1, deepfield: 1, eclipse: 1, moonlight: 1, patch: 1,
};

/** Story variants that fill the card with charts and need a clean backdrop. */
const DENSE_VARIANTS: Readonly<Record<string, 1>> = {
  spectrum: 1, skydome: 1, moons: 1, timeline: 1, bests: 1, year: 1,
};

/** Extra scrim between busy background art and content-heavy layouts. */
function legibilityScrim(ctx: Ctx, w: number, h: number, themeId: ShareThemeId): void {
  if (!BUSY_THEMES[themeId]) {
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(7,9,17,0.50)');
  g.addColorStop(0.5, 'rgba(7,9,17,0.44)');
  g.addColorStop(1, 'rgba(7,9,17,0.56)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Tracked section eyebrow. */
function sectionLabel(ctx: Ctx, text: string, x: number, y: number, t: ResolvedTheme, sc: number, align?: CanvasTextAlign): void {
  ctx.fillStyle = t.label;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.font = fnt(700, 17 * sc, t.f.label);
  setLS(ctx, 2.2 * sc);
  ctx.fillText(text, x, y);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/** Living-constellation dot-network field (matches the landing background). */
function drawConstellationField(ctx: Ctx, W: number, H: number, t: ResolvedTheme, seed: number): void {
  if (t.scrim === 'light') {
    return;
  }
  const rnd = mkRand(seed || 77);
  const sc = Math.min(W, H) / 1080;
  const pts: { x: number; y: number; r: number; a: number }[] = [];
  const n = Math.round(Math.min(54, (W * H) / 24000));
  for (let i = 0; i < n; i++) {
    pts.push({ x: rnd() * W, y: rnd() * H, r: (0.8 + rnd() * 1.9) * sc, a: 0.45 + rnd() * 0.5 });
  }
  const tagged: { x: number; y: number; col: string }[] = [];
  const tn = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < tn; i++) {
    tagged.push({ x: (0.12 + 0.76 * rnd()) * W, y: (0.1 + 0.62 * rnd()) * H, col: i % 2 ? CYAN : PINK });
  }
  const nodes: { x: number; y: number }[] = [...pts, ...tagged];
  const MAX = 148 * sc;
  const MAX2 = MAX * MAX;
  const c = [255, 42, 123];
  const c2 = [25, 230, 221];
  ctx.save();
  ctx.lineWidth = 1.4 * sc;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < MAX2) {
        const d = Math.sqrt(d2);
        const al = 1 - d / MAX;
        const k = Math.max(0, Math.min(1, (a.x + b.x) / 2 / W));
        ctx.strokeStyle = `rgba(${(c[0] + (c2[0] - c[0]) * k) | 0},${(c[1] + (c2[1] - c[1]) * k) | 0},${(c[2] + (c2[2] - c[2]) * k) | 0},${(al * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  for (const p of pts) {
    ctx.globalAlpha = p.a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const g of tagged) {
    const r = 7 * sc;
    const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 30 * sc);
    grd.addColorStop(0, `${g.col}aa`);
    grd.addColorStop(1, `${g.col}00`);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 30 * sc, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - r);
    ctx.quadraticCurveTo(g.x + r * 0.18, g.y - r * 0.18, g.x + r, g.y);
    ctx.quadraticCurveTo(g.x + r * 0.18, g.y + r * 0.18, g.x, g.y + r);
    ctx.quadraticCurveTo(g.x - r * 0.18, g.y + r * 0.18, g.x - r, g.y);
    ctx.quadraticCurveTo(g.x - r * 0.18, g.y - r * 0.18, g.x, g.y - r);
    ctx.fill();
    ctx.strokeStyle = g.col;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6 * sc;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12 * sc, 0, 6.283);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// ---- data graphics ---------------------------------------------------------

/** One moon-phase ring with its lit fraction, used by the hero year band. */
function drawPhaseDot(ctx: Ctx, x: number, y: number, r: number, illum: number, color: string, glow: boolean): void {
  ctx.save();
  ctx.lineWidth = Math.max(1.4, r * 0.16);
  ctx.strokeStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 1.7;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (illum > 0.012) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.clip();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 1.4;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + (1 - illum) * 2 * r * 0.98, y, r, 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}

/** Big neon years (start cyan → end pink) with a moon-phase progression between. */
function drawHeroYears(ctx: Ctx, w: number, cy: number, sc: number, yy1: number, yy2: number, f: ShareFont, isStory: boolean): void {
  const s1 = String(yy1);
  const s2 = String(yy2);
  const padH = w * 0.085 * 0.5;
  const rDot = (isStory ? 12 : 10) * sc;
  const dotN = 5;
  const gap = (isStory ? 28 : 22) * sc;
  let tlW = (isStory ? 210 : 190) * sc;
  let yrSize = (isStory ? 50 : 40) * sc;
  const yw = (str: string, sz: number): number => {
    ctx.font = fnt(f.numW, sz, f.num);
    return ctx.measureText(str).width;
  };
  const total = (): number => yw(s1, yrSize) + gap + (tlW + 2 * rDot) + gap + yw(s2, yrSize);
  while (total() > w - 2 * padH && yrSize > 34 * sc) {
    yrSize -= 2 * sc;
  }
  if (total() > w - 2 * padH) {
    tlW = Math.max(120 * sc, tlW - (total() - (w - 2 * padH)));
  }
  let x = w / 2 - total() / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setLS(ctx, 0);
  ctx.font = fnt(f.numW, yrSize, f.num);
  ctx.save();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = yrSize * 0.32;
  ctx.fillStyle = CYAN;
  ctx.fillText(s1, x, cy);
  ctx.restore();
  x += yw(s1, yrSize) + gap;
  const dx0 = x + rDot;
  const dx1 = dx0 + tlW;
  const lg = ctx.createLinearGradient(dx0, 0, dx1, 0);
  lg.addColorStop(0, hexA(CYAN, 0.45));
  lg.addColorStop(1, hexA(PINK, 0.85));
  ctx.strokeStyle = lg;
  ctx.lineWidth = 2.2 * sc;
  ctx.beginPath();
  ctx.moveTo(dx0, cy);
  ctx.lineTo(dx1, cy);
  ctx.stroke();
  for (let i = 0; i < dotN; i++) {
    const tt = i / (dotN - 1);
    const dxp = dx0 + tt * tlW;
    const col = lerpHex(CYAN, PINK, tt);
    const last = i === dotN - 1;
    drawPhaseDot(ctx, dxp, cy, last ? rDot * 1.06 : rDot, tt, col, last);
  }
  x = dx1 + rDot + gap;
  ctx.font = fnt(f.numW, yrSize, f.num);
  ctx.save();
  ctx.shadowColor = PINK;
  ctx.shadowBlur = yrSize * 0.32;
  ctx.fillStyle = PINK;
  ctx.fillText(s2, x, cy);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
}

/** Nightly activity timeline with a visible year axis. */
function drawTimeline(ctx: Ctx, x: number, y: number, w: number, hgt: number, activity: ShareActivityNight[], t: ResolvedTheme, sc: number): void {
  if (!activity || !activity.length) {
    return;
  }
  const max = activity.reduce((a, s) => Math.max(a, s.integrationSeconds), 1);
  const start = parseDate(activity[0].date);
  const end = parseDate(activity[activity.length - 1].date);
  if (!start || !end) {
    return;
  }
  const span = Math.max(1, daysBetween(start, end));
  const baseline = y + hgt;
  const px = (d: Date): number => x + Math.min(1, Math.max(0, daysBetween(start, d) / span)) * w;
  const y1 = start.getUTCFullYear();
  const y2 = end.getUTCFullYear();
  ctx.textBaseline = 'top';
  for (let Y = y1; Y <= y2; Y++) {
    const boundary = Y === y1 ? start : new Date(Date.UTC(Y, 0, 1));
    const gx = px(boundary);
    if (Y > y1) {
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, y - 4 * sc);
      ctx.lineTo(gx, baseline);
      ctx.stroke();
    }
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 17 * sc, t.f.label);
    setLS(ctx, 1 * sc);
    ctx.textAlign = 'left';
    ctx.fillText(String(Y), Math.min(gx + (Y > y1 ? 8 * sc : 0), x + w - 46 * sc), baseline + 12 * sc);
    setLS(ctx, 0);
  }
  ctx.textAlign = 'left';
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, baseline);
  ctx.lineTo(x + w, baseline);
  ctx.stroke();
  const byDay = new Map<string, number>();
  for (const a of activity) {
    const k = dayKey(a.date);
    if (k) {
      byDay.set(k, a.integrationSeconds);
    }
  }
  const cols = Math.min(span + 1, Math.floor(w / 4));
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const di = Math.round((i / cols) * span);
    const d = new Date(start.getTime() + di * 86400000);
    const k = dayKey(d);
    const secs = k ? byDay.get(k) : undefined;
    if (!secs) {
      continue;
    }
    const v = secs / max;
    const bh = (0.12 + 0.88 * v) * hgt;
    ctx.fillStyle = t.heroColor;
    ctx.globalAlpha = 0.6 + 0.4 * v;
    roundRect(ctx, x + i * cw, baseline - bh, Math.max(2, cw - 2 * sc), bh, 2 * sc);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Filter breakdown as a labelled bar chart. */
function drawFilterBars(ctx: Ctx, x: number, y: number, w: number, chartH: number, dist: ShareFilterDistribution, t: ResolvedTheme, sc: number): void {
  const order = presentFilters(dist);
  if (!order.length) {
    return;
  }
  const max = order.reduce((a, k) => Math.max(a, dist[k] ?? 0), 1);
  const slot = w / order.length;
  const barW = Math.min(slot * 0.5, 62 * sc);
  const baseline = y + chartH;
  const headroom = 34 * sc;
  const usable = Math.max(12, chartH - headroom);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, baseline);
  ctx.lineTo(x + w, baseline);
  ctx.stroke();
  order.forEach((k, i) => {
    const cx = x + slot * i + slot / 2;
    const v = (dist[k] ?? 0) / max;
    const bh = (0.1 + 0.9 * v) * usable;
    ctx.fillStyle = filterColor(k, t);
    ctx.globalAlpha = 1;
    roundRect(ctx, cx - barW / 2, baseline - bh, barW, bh, 5 * sc);
    ctx.fill();
    ctx.fillStyle = t.sub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = fnt(600, 16 * sc, t.f.label);
    setLS(ctx, 0);
    ctx.fillText(`${fmtHours(dist[k] ?? 0)}h`, cx, baseline - bh - 9 * sc);
    ctx.fillStyle = t.label;
    ctx.textBaseline = 'top';
    ctx.font = fnt(700, 17 * sc, t.f.label);
    ctx.fillText(SHARE_FILTER_META[k].label, cx, baseline + 10 * sc);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Single stacked filter bar + centred legend; `showHours` adds the hours. */
function filterStacked(ctx: Ctx, x: number, y: number, w: number, hh: number, dist: ShareFilterDistribution, t: ResolvedTheme, sc: number, showHours = false): void {
  const order = presentFilters(dist);
  const sum = order.reduce((a, k) => a + (dist[k] ?? 0), 0) || 1;
  roundRect(ctx, x, y, w, hh, hh / 2);
  ctx.fillStyle = hexA(t.label, 0.16);
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, hh, hh / 2);
  ctx.clip();
  let cx = x;
  order.forEach((k) => {
    const sw = (w * (dist[k] ?? 0)) / sum;
    ctx.fillStyle = filterColor(k, t);
    ctx.fillRect(cx, y, sw + 1, hh);
    cx += sw;
  });
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.font = fnt(600, 27 * sc, t.f.label);
  const labelFor = (k: ShareFilterKey): string => (showHours ? `${SHARE_FILTER_META[k].label}  ${fmtHM(dist[k] ?? 0)}` : SHARE_FILTER_META[k].label);
  const widths = order.map((k) => ctx.measureText(labelFor(k)).width + 40 * sc);
  const tw = widths.reduce((a, b) => a + b, 0);
  let lx = x + (w - tw) / 2;
  order.forEach((k, i) => {
    ctx.fillStyle = filterColor(k, t);
    ctx.beginPath();
    ctx.arc(lx + 7 * sc, y + hh + 34 * sc, 5 * sc, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = t.sub;
    ctx.textAlign = 'left';
    ctx.fillText(labelFor(k), lx + 18 * sc, y + hh + 34 * sc);
    lx += widths[i];
  });
  ctx.textBaseline = 'alphabetic';
}
// ---- identity helpers ------------------------------------------------------

/** Resolves the printed identity from the edited identity, else the observer line. */
function objIdentity(model: ShareModel): { name: string; handle: string } {
  const op = (model.observer || '').split('—').map((x) => x.trim());
  return {
    name: model.identity.name || op[0] || model.observer || '',
    handle: model.identity.handle || op[1] || '',
  };
}

/** Name printed on the single cards (respects the edited identity). */
function cardName(model: ShareModel): string {
  return objIdentity(model).name || 'Astrophotographer';
}

// ---- summary layouts -------------------------------------------------------

/** Portrait / square summary layout — centred identity hero + stats + filters. */
function drawTall(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = w / 1080;
  const pad = w * 0.085;
  const s = model.summary;
  const isStory = h > w * 1.3;
  const f = t.f;
  const footY = h - pad * 0.6;
  const id = objIdentity(model);
  const name = id.name || 'Astrophotographer';
  const handle = id.handle;

  // header: wordmark (left) + rig (right)
  drawGlyph(ctx, pad + 15 * sc, pad + 16 * sc, 15 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 30 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 40 * sc, pad + 17 * sc, t);
  const eq = model.equipment.slice().sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  const opt = eq.filter((e) => e.kind !== 'Camera')[0];
  const cam = eq.filter((e) => e.kind === 'Camera')[0];
  const rig: string[] = [];
  if (opt) {
    rig.push(opt.displayName);
  }
  if (cam) {
    rig.push(cam.displayName);
  }
  if (rig.length) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 15 * sc, f.label);
    setLS(ctx, 3 * sc);
    ctx.fillText('RIG', w - pad, pad + 4 * sc);
    setLS(ctx, 0);
    ctx.fillStyle = t.sub;
    ctx.font = fnt(500, 17 * sc, f.label);
    rig.forEach((ln, i) => ctx.fillText(ln, w - pad, pad + 26 * sc + i * 21 * sc));
  }

  // primary: "[Name]'s Celestory" + handle
  ctx.textAlign = 'center';
  const nameY = h * (isStory ? 0.175 : 0.205);
  const poss = name + (/s$/i.test(name) ? '’ ' : '’s ');
  const lead = `${poss}Cele`;
  const tail = 'story';
  let nameSize = (isStory ? 96 : 68) * sc;
  ctx.font = fnt(f.headW, nameSize, f.head);
  while (ctx.measureText(lead + tail).width > w - pad * 2 && nameSize > 30 * sc) {
    nameSize -= 2 * sc;
    ctx.font = fnt(f.headW, nameSize, f.head);
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const totalW = ctx.measureText(lead + tail).width;
  const nx = w / 2 - totalW / 2;
  ctx.fillStyle = t.ink;
  ctx.fillText(lead, nx, nameY);
  ctx.fillStyle = t.accent;
  ctx.fillText(tail, nx + ctx.measureText(lead).width, nameY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (handle) {
    ctx.fillStyle = t.accent;
    ctx.font = fnt(600, (isStory ? 42 : 34) * sc, f.label);
    ctx.fillText(handle, w / 2, nameY + (isStory ? 84 : 66) * sc);
  }

  // hero year band
  const yda = parseDate(s.firstLight);
  const ydb = parseDate(s.latestSession);
  const yd0 = yda ?? ydb;
  if (yd0) {
    const yy1 = yd0.getUTCFullYear();
    const yy2 = (ydb ?? yda)!.getUTCFullYear();
    const yY = nameY + (isStory ? 158 : 116) * sc;
    drawHeroYears(ctx, w, yY, sc, yy1, yy2, f, isStory);
  }

  // hero time
  const ty = h * (isStory ? 0.41 : 0.455);
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, (isStory ? 28 : 24) * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('HOURS UNDER STARLIGHT', w / 2, ty - (isStory ? 48 : 42) * sc);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.font = fnt(f.numW, (isStory ? 150 : 110) * sc, f.num);
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtHM(s.totalIntegrationSeconds), w / 2, ty + (isStory ? 34 : 30) * sc);

  // stat row
  const stats: [string, string][] = [
    [fmtInt(s.uniqueObjects), 'TARGETS'],
    [fmtInt(s.nightsImaged), 'NIGHTS'],
    [fmtInt(s.totalLightFrames), 'FRAMES'],
  ];
  const divY = h * (isStory ? 0.585 : 0.605);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, divY);
  ctx.lineTo(w - pad, divY);
  ctx.stroke();
  const colW = (w - pad * 2) / 3;
  const statNum = (isStory ? 92 : 68) * sc;
  const stTop = divY + 30 * sc;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let ns = statNum;
    ctx.font = fnt(f.numW, ns, f.num);
    while (ctx.measureText(st[0]).width > colW - 16 * sc && ns > 40 * sc) {
      ns -= 2 * sc;
      ctx.font = fnt(f.numW, ns, f.num);
    }
    ctx.fillStyle = t.ink;
    ctx.fillText(st[0], cx, stTop + (statNum - ns));
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, (isStory ? 26 : 22) * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(st[1], cx, stTop + statNum + 16 * sc);
    setLS(ctx, 0);
  });

  // filters used
  const ly = h * (isStory ? 0.77 : 0.8);
  ctx.textAlign = 'center';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, (isStory ? 30 : 25) * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FILTERS USED', w / 2, ly);
  setLS(ctx, 0);
  filterStacked(ctx, pad, ly + 24 * sc, w - 2 * pad, 20 * sc, s.filterDistribution, t, sc);

  // footer
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(600, 17 * sc, f.label);
  setLS(ctx, 0.5 * sc);
  ctx.fillText('Create your own Celestory', pad, footY);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.accent;
  ctx.fillText('celestory.dbastrosuite.com', w - pad, footY);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/** Landscape summary layout — left identity, right filter chart. */
function drawWide(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = w / 1200;
  const pad = w * 0.062;
  const s = model.summary;
  const f = t.f;
  const colX = w * 0.55;
  const yl = yearLabel(s.firstLight, s.latestSession);

  drawGlyph(ctx, pad + 14 * sc, pad + 14 * sc, 14 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 27 * sc, f.head);
  drawWordmark(ctx, pad + 38 * sc, pad + 15 * sc, t);
  if (model.observer) {
    ctx.font = fnt(500, 16 * sc, f.label);
    ctx.fillStyle = t.sub;
    ctx.textBaseline = 'middle';
    ctx.fillText(`  ·  ${model.observer}`, pad + 38 * sc + ctx.measureText('Celestory').width + 10 * sc, pad + 16 * sc);
  }

  if (yl) {
    sectionLabel(ctx, yl.indexOf('–') === -1 ? 'YEAR IN REVIEW' : 'IN REVIEW', w - pad, pad + 4 * sc, t, sc, 'right');
    ctx.fillStyle = t.ink;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = fnt(f.numW, 44 * sc, f.num);
    ctx.fillText(yl, w - pad, pad + 22 * sc);
  }
  ctx.textAlign = 'left';

  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, h * 0.255);
  ctx.lineTo(w - pad, h * 0.255);
  ctx.stroke();

  let y = h * 0.34;
  sectionLabel(ctx, 'TOTAL INTEGRATION', pad, y, t, sc);
  const heroSize = 94 * sc;
  ctx.fillStyle = t.heroColor;
  ctx.textBaseline = 'top';
  ctx.font = fnt(f.headW, heroSize, f.head);
  ctx.fillText(fmtHM(s.totalIntegrationSeconds), pad - 2, y + 26 * sc);
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, 17 * sc, f.label);
  ctx.fillText(`≈ ${fmtNights(s.totalIntegrationSeconds)} clear nights  ·  ${fmtRange(s.firstLight, s.latestSession)}`, pad, y + 26 * sc + heroSize + 12 * sc);

  const stats: [string, string][] = [
    [fmtInt(s.uniqueObjects), 'TARGETS'],
    [fmtInt(s.nightsImaged), 'NIGHTS'],
    [fmtInt(s.totalLightFrames), 'FRAMES'],
  ];
  const sColW = (colX - pad - 40 * sc) / 3;
  const statTop = h * 0.68;
  stats.forEach((st, i) => {
    const cx = pad + sColW * i;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, 46 * sc, f.num);
    ctx.fillText(st[0], cx, statTop);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 17 * sc, f.label);
    setLS(ctx, 1.5 * sc);
    ctx.fillText(st[1], cx + 1 * sc, statTop + 52 * sc);
    setLS(ctx, 0);
  });

  const rTop = h * 0.34;
  sectionLabel(ctx, 'FILTER BREAKDOWN', colX, rTop, t, sc);
  drawFilterBars(ctx, colX, rTop + 38 * sc, w - pad - colX, h * 0.4, s.filterDistribution, t, sc);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillStyle = t.accent;
  ctx.font = fnt(600, 16 * sc, f.label);
  ctx.fillText('celestory.dbastrosuite.com', w - pad, h - pad * 0.5);
  ctx.textAlign = 'left';
  void y;
}
// ---- render entry ----------------------------------------------------------

/** Font-readiness cache so we only await once. */
let fontsReady: Promise<void> | null = null;

/** Ensures the canvas fonts are loaded before the first paint (browser-only). */
export async function ensureShareFonts(): Promise<void> {
  if (fontsReady) {
    return fontsReady;
  }
  fontsReady = (
    typeof document !== 'undefined' && document.fonts
      ? Promise.all(SHARE_FONT_SPECS.map((sp) => document.fonts.load(sp)))
          .then(() => document.fonts.ready)
          .then(() => undefined)
      : Promise.resolve()
  ).catch(() => undefined);
  return fontsReady;
}

/**
 * Renders a single share card into `canvas` for the given theme + format +
 * story variant. Variants: summary | year | timeline | targets | spectrum |
 * skydome | moons | equipment | bests. Browser-only (Canvas 2D).
 */
export function renderShareCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  themeId: ShareThemeId,
  formatId: ShareFormatId,
  variant: string,
): void {
  const dims = SHARE_FORMATS[formatId] ?? SHARE_FORMATS.story;
  const t = resolveTheme(themeId);
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, dims.w, dims.h);
  t.paint(ctx, dims.w, dims.h);
  scrim(ctx, dims.w, dims.h, t);
  drawConstellationField(ctx, dims.w, dims.h, t, 77);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, dims.w - 28, dims.h - 28, 22);
  ctx.stroke();
  const v = variant || 'summary';
  if (DENSE_VARIANTS[v]) {
    legibilityScrim(ctx, dims.w, dims.h, themeId);
  }
  if (v === 'targets') {
    drawVariantCard(ctx, dims, model, t, 'targets');
    return;
  }
  if (v === 'equipment') {
    drawVariantCard(ctx, dims, model, t, 'equipment');
    return;
  }
  if (v === 'year') {
    drawYearCard(ctx, dims, model, t);
    return;
  }
  if (v === 'timeline') {
    drawTimelineCard(ctx, dims, model, t);
    return;
  }
  if (v === 'spectrum') {
    drawSpectrumCard(ctx, dims, model, t);
    return;
  }
  if (v === 'skydome') {
    drawSkyDomeCard(ctx, dims, model, t);
    return;
  }
  if (v === 'moons') {
    drawMoonCard(ctx, dims, model, t);
    return;
  }
  if (v === 'bests') {
    drawBestsCard(ctx, dims, model, t);
    return;
  }
  if (formatId === 'landscape') {
    drawWide(ctx, dims, model, t);
  } else {
    drawTall(ctx, dims, model, t);
  }
}

/** Two-line credit footer ("Create your own Celestory" / URL). */
function cardFooter(ctx: Ctx, w: number, h: number, sc: number, t: ResolvedTheme, pad: number): void {
  const f = t.f;
  const footY = h - pad * 0.6;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(600, 17 * sc, f.label);
  setLS(ctx, 0.5 * sc);
  ctx.fillText('Create your own Celestory', pad, footY);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.accent;
  ctx.fillText('celestory.dbastrosuite.com', w - pad, footY);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/** Single-card variants that reuse carousel slide content with card chrome. */
function drawVariantCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme, which: 'targets' | 'equipment'): void {
  const w = dims.w;
  const h = dims.h;
  const sc = Math.min(w, h) / 1080;
  const f = t.f;
  const pad = w * 0.085;
  drawGlyph(ctx, pad + 15 * sc, pad + 16 * sc, 15 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 30 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 40 * sc, pad + 17 * sc, t);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.sub;
  ctx.font = fnt(600, 18 * sc, f.label);
  ctx.fillText(cardName(model), w - pad, pad + 17 * sc);
  ctx.textAlign = 'left';
  const slideFn = which === 'targets' ? targetsSlide : equipmentSlide;
  ctx.save();
  slideFn(ctx, { w, h, sc, index: 0 }, model, t);
  ctx.restore();
  const footY = h - pad + 6 * sc;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(600, 17 * sc, f.label);
  setLS(ctx, 0.5 * sc);
  ctx.fillText('Create your own Celestory', pad, footY);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.accent;
  ctx.fillText('celestory.dbastrosuite.com', w - pad, footY);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/** Year-in-review — the selected year set in giant type. */
function drawYearCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = Math.min(w, h) / 1080;
  const f = t.f;
  const s = model.summary;
  const wide = w > h * 1.15;
  const isStory = h > w * 1.3;
  const pad = w * (wide ? 0.06 : 0.085);
  const yl = yearLabel(s.firstLight, s.latestSession) || '—';
  const nm = cardName(model);
  const first = (nm || '').trim().split(' ')[0];
  const nF = presentFilters(s.filterDistribution).length;

  drawGlyph(ctx, pad + 15 * sc, pad + 16 * sc, 15 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 30 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 40 * sc, pad + 17 * sc, t);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.sub;
  ctx.font = fnt(600, 18 * sc, f.label);
  ctx.fillText(nm, w - pad, pad + 17 * sc);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (wide) {
    const colX = w * 0.56;
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, h * 0.24);
    ctx.lineTo(w - pad, h * 0.24);
    ctx.stroke();
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 20 * sc, f.label);
    setLS(ctx, 4 * sc);
    ctx.textBaseline = 'top';
    ctx.fillText(`${first ? `${first.toUpperCase()}’S ` : ''}YEAR IN REVIEW`, pad, h * 0.31);
    setLS(ctx, 0);
    let yS = 230 * sc;
    ctx.font = fnt(f.numW, yS, f.num);
    while (ctx.measureText(yl).width > colX - pad - 24 * sc && yS > 60 * sc) {
      yS -= 4 * sc;
      ctx.font = fnt(f.numW, yS, f.num);
    }
    ctx.fillStyle = t.heroColor;
    ctx.fillText(yl, pad - 3 * sc, h * 0.37);
    ctx.fillStyle = t.sub;
    ctx.font = fnt(500, 19 * sc, f.label);
    ctx.fillText(`≈ ${fmtNights(s.totalIntegrationSeconds)} clear nights  ·  ${fmtRange(s.firstLight, s.latestSession)}`, pad, h * 0.37 + yS + 16 * sc);
    const cells: [string, string][] = [
      ['TOTAL', fmtHM(s.totalIntegrationSeconds)],
      ['OBJECTS', fmtInt(s.uniqueObjects)],
      ['NIGHTS', fmtInt(s.nightsImaged)],
      ['FILTERS', fmtInt(nF)],
    ];
    const gw = w - pad - colX;
    const cw2 = gw / 2;
    cells.forEach((c, i) => {
      const cx = colX + (i % 2) * cw2;
      const cy = h * 0.34 + Math.floor(i / 2) * h * 0.2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.label;
      ctx.font = fnt(700, 14 * sc, f.label);
      setLS(ctx, 2 * sc);
      ctx.fillText(c[0], cx, cy);
      setLS(ctx, 0);
      ctx.fillStyle = t.ink;
      ctx.font = fnt(f.numW, 52 * sc, f.num);
      ctx.fillText(c[1], cx, cy + 22 * sc);
    });
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 16 * sc, f.label);
    setLS(ctx, 3 * sc);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('NIGHT BY NIGHT', pad, h * 0.76);
    setLS(ctx, 0);
    drawTimeline(ctx, pad, h * 0.79, w - 2 * pad, h * 0.1, s.activity, t, sc);
    cardFooter(ctx, w, h, sc, t, pad);
    return;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 19 * sc, f.label);
  setLS(ctx, 4 * sc);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${first ? `${first.toUpperCase()}’S ` : ''}YEAR IN REVIEW`, w / 2, h * (isStory ? 0.135 : 0.15));
  setLS(ctx, 0);
  let yS = (isStory ? 300 : 240) * sc;
  ctx.font = fnt(f.numW, yS, f.num);
  while (ctx.measureText(yl).width > w - pad * 2 && yS > 80 * sc) {
    yS -= 4 * sc;
    ctx.font = fnt(f.numW, yS, f.num);
  }
  ctx.fillStyle = t.heroColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(yl, w / 2, h * (isStory ? 0.245 : 0.27));
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, (isStory ? 24 : 22) * sc, f.label);
  ctx.fillText(`≈ ${fmtNights(s.totalIntegrationSeconds)} clear nights  ·  ${fmtRange(s.firstLight, s.latestSession)}`, w / 2, h * (isStory ? 0.355 : 0.4));

  const ty = h * (isStory ? 0.475 : 0.52);
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 19 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('TOTAL INTEGRATION', w / 2, ty - 38 * sc);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.font = fnt(f.numW, (isStory ? 120 : 104) * sc, f.num);
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtHM(s.totalIntegrationSeconds), w / 2, ty + 26 * sc);
  ctx.textBaseline = 'alphabetic';

  const stats: [string, string][] = [
    [fmtInt(s.uniqueObjects), 'OBJECTS'],
    [fmtInt(s.nightsImaged), 'NIGHTS'],
    [fmtInt(s.totalLightFrames), 'FRAMES'],
  ];
  const divY = h * (isStory ? 0.625 : 0.66);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, divY);
  ctx.lineTo(w - pad, divY);
  ctx.stroke();
  const colW = (w - pad * 2) / 3;
  const statNum = (isStory ? 80 : 70) * sc;
  const stTop = divY + 28 * sc;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, statNum, f.num);
    ctx.fillText(st[0], cx, stTop);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 15 * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(st[1], cx, stTop + statNum + 14 * sc);
    setLS(ctx, 0);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 17 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('THIS YEAR, NIGHT BY NIGHT', pad, h * (isStory ? 0.78 : 0.79));
  setLS(ctx, 0);
  drawTimeline(ctx, pad, h * (isStory ? 0.8 : 0.81), w - 2 * pad, h * (isStory ? 0.1 : 0.09), s.activity, t, sc);
  cardFooter(ctx, w, h, sc, t, pad);
}

/** Shared variant-card geometry. */
function vcGeom(dims: Dims): { w: number; h: number; sc: number; wide: boolean; isStory: boolean; pad: number } {
  const w = dims.w;
  const h = dims.h;
  const sc = Math.min(w, h) / 1080;
  return { w, h, sc, wide: w > h * 1.15, isStory: h > w * 1.3, pad: w * (w > h * 1.15 ? 0.06 : 0.085) };
}

/** Variant-card header band (wordmark + name + eyebrow + optional title). */
function vcHeader(ctx: Ctx, gm: ReturnType<typeof vcGeom>, model: ShareModel, t: ResolvedTheme, eyebrow: string, title: string): number {
  const f = t.f;
  const sc = gm.sc;
  const pad = gm.pad;
  const nm = cardName(model);
  drawGlyph(ctx, pad + 15 * sc, pad + 16 * sc, 15 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 30 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 40 * sc, pad + 17 * sc, t);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.sub;
  ctx.font = fnt(600, 18 * sc, f.label);
  ctx.fillText(nm, gm.w - pad, pad + 17 * sc);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = gm.h * (gm.wide ? 0.2 : gm.isStory ? 0.135 : 0.15);
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 19 * sc, f.label);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(eyebrow, pad, titleY);
  setLS(ctx, 0);
  if (title) {
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.headW, (gm.wide ? 50 : gm.isStory ? 54 : 46) * sc, f.head);
    ctx.textBaseline = 'top';
    ctx.fillText(title, pad - 2 * sc, titleY + 16 * sc);
    ctx.textBaseline = 'alphabetic';
  }
  return titleY;
}

/** Variant-card stat row (divider + N columns). */
function vcStatRow(ctx: Ctx, gm: ReturnType<typeof vcGeom>, t: ResolvedTheme, stats: [string, string, string?][], sy: number): void {
  const f = t.f;
  const sc = gm.sc;
  const pad = gm.pad;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, sy - 18 * sc);
  ctx.lineTo(gm.w - pad, sy - 18 * sc);
  ctx.stroke();
  const colW = (gm.w - pad * 2) / stats.length;
  const num = (gm.wide ? 44 : 48) * sc;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = st[2] || t.ink;
    ctx.font = fnt(f.numW, num, f.num);
    ctx.fillText(st[0], cx, sy);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 18 * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(st[1], cx, sy + num + 13 * sc);
    setLS(ctx, 0);
  });
  ctx.textAlign = 'left';
}
// ---- chart variant cards ---------------------------------------------------

/** Filter Spectrum — light broken into emission lines on a wavelength axis. */
function drawSpectrumCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const gm = vcGeom(dims);
  const { w, h, sc, pad } = gm;
  const f = t.f;
  const s = model.summary;
  const dist = s.filterDistribution;
  const keys = presentFilters(dist);
  const total = keys.reduce((a, k) => a + (dist[k] ?? 0), 0) || 1;
  const maxV = keys.reduce((a, k) => Math.max(a, dist[k] ?? 0), 1);
  vcHeader(ctx, gm, model, t, 'LIGHT COLLECTED, LINE BY LINE', `${fmtHours(total)} hours of photons`);
  const WL: Partial<Record<ShareFilterKey, number>> = { B: 460, OIII: 501, G: 535, L: 565, R: 620, Ha: 656, SII: 672 };
  const nm0 = 420;
  const nm1 = 700;
  const gx = pad;
  const gw = w - 2 * pad;
  const gy = h * (gm.wide ? 0.4 : gm.isStory ? 0.34 : 0.36);
  const gh = h * (gm.wide ? 0.34 : gm.isStory ? 0.36 : 0.34);
  const baseY = gy + gh;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.4 * sc;
  ctx.beginPath();
  ctx.moveTo(gx, baseY);
  ctx.lineTo(gx + gw, baseY);
  ctx.stroke();
  ctx.fillStyle = t.label;
  ctx.font = fnt(600, 19 * sc, f.label);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  [450, 500, 550, 600, 650, 700].forEach((nm) => {
    const x = gx + gw * (nm - nm0) / (nm1 - nm0);
    ctx.fillRect(x - 0.8 * sc, baseY + 4 * sc, 1.6 * sc, 8 * sc);
    ctx.fillText(`${nm}nm`, x, baseY + 18 * sc);
  });
  keys.forEach((k) => {
    const x = gx + gw * ((WL[k] ?? 560) - nm0) / (nm1 - nm0);
    const col = filterColor(k, t);
    const bh = gh * (0.22 + 0.78 * ((dist[k] ?? 0) / maxV));
    const bw = 18 * sc;
    ctx.fillStyle = col;
    roundRect(ctx, x - bw / 2, baseY - bh, bw, bh, 3 * sc);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, 31 * sc, f.num);
    ctx.fillText(`${fmtHours(dist[k] ?? 0)}h`, x, baseY - bh - 42 * sc);
    ctx.fillStyle = col;
    ctx.font = fnt(700, 22 * sc, f.label);
    setLS(ctx, 1.5 * sc);
    ctx.fillText(SHARE_FILTER_META[k].label.toUpperCase(), x, baseY - bh - 13 * sc);
    setLS(ctx, 0);
  });
  ctx.textAlign = 'left';
  const narrow = keys.filter((k) => k === 'Ha' || k === 'OIII' || k === 'SII');
  const nbSecs = narrow.reduce((a, k) => a + (dist[k] ?? 0), 0);
  vcStatRow(ctx, gm, t, [
    [fmtInt(keys.length), 'FILTERS'],
    [`${Math.round((nbSecs / total) * 100)}%`, 'NARROWBAND'],
    [fmtHM(s.totalIntegrationSeconds), 'INTEGRATION', t.heroColor],
  ], h * (gm.wide ? 0.8 : 0.81));
  cardFooter(ctx, w, h, sc, t, pad);
}

/** Sky Dome — an all-sky polar plot; targets are stars sized by integration. */
function drawSkyDomeCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const gm = vcGeom(dims);
  const { w, h, sc, pad } = gm;
  const f = t.f;
  const s = model.summary;
  const objs = model.objects.slice().sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  vcHeader(ctx, gm, model, t, 'YOUR SKY, CHARTED', `${fmtInt(s.uniqueObjects)} targets on the dome`);
  const cy = h * (gm.wide ? 0.55 : gm.isStory ? 0.5 : 0.52);
  const R = Math.min(w * (gm.wide ? 0.21 : 0.36), h * 0.3);
  const cx = gm.wide ? w * 0.3 : w / 2;
  ctx.strokeStyle = hexA(t.label, 0.3);
  ctx.lineWidth = 1.2 * sc;
  [1, 0.66, 0.33].forEach((rr) => {
    ctx.beginPath();
    ctx.arc(cx, cy, R * rr, 0, 6.283);
    ctx.stroke();
  });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  const hg = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.18);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.82, hexA(t.heroColor, 0.1));
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.18, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 15 * sc, f.label);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ([['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]] as [string, number, number][]).forEach((c) => {
    ctx.fillText(c[0], cx + c[1] * (R + 22 * sc), cy + c[2] * (R + 22 * sc));
  });
  ctx.fillStyle = hexA(t.label, 0.7);
  ctx.beginPath();
  ctx.arc(cx, cy, 2.4 * sc, 0, 6.283);
  ctx.fill();
  const maxI = objs.length ? objs[0].totalIntegrationSeconds : 1;
  const labelled: { o: ShareModelObject; x: number; y: number; r: number }[] = [];
  objs.forEach((o, i) => {
    let hsh = 2166136261;
    const id = String(o.id);
    for (let c = 0; c < id.length; c++) {
      hsh = ((hsh ^ id.charCodeAt(c)) * 16777619) >>> 0;
    }
    const ang = ((hsh % 3600) / 3600) * 6.283;
    const rad = R * (0.18 + (((hsh >> 12) % 1000) / 1000) * 0.78);
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    const m = o.totalIntegrationSeconds / maxI;
    const r = (3 + 11 * Math.pow(m, 0.6)) * sc;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2.6);
    g.addColorStop(0, hexA(t.heroColor, 0.5 * (0.4 + m * 0.6)));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.6, 0, 6.283);
    ctx.fill();
    vSparkle(ctx, px, py, r, i < 3 ? '#ffffff' : hexA(t.ink, 0.9));
    if (i < 3) {
      labelled.push({ o, x: px, y: py, r });
    }
  });
  ctx.textBaseline = 'alphabetic';
  labelled.forEach((L) => {
    ctx.textAlign = L.x > cx ? 'left' : 'right';
    const lx = L.x + (L.x > cx ? 1 : -1) * (L.r + 9 * sc);
    ctx.fillStyle = t.ink;
    ctx.font = fnt(600, 18 * sc, f.label);
    ctx.fillText(L.o.displayName, lx, L.y - 2 * sc);
    ctx.fillStyle = t.label;
    ctx.font = fnt(500, 14 * sc, f.label);
    ctx.fillText(fmtHM(L.o.totalIntegrationSeconds), lx, L.y + 14 * sc);
  });
  ctx.textAlign = 'left';
  if (gm.wide) {
    const sx = w * 0.58;
    let yy = h * 0.36;
    ([[fmtInt(s.uniqueObjects), 'TARGETS CHARTED'], [fmtHM(s.totalIntegrationSeconds), 'TOTAL INTEGRATION'], [fmtInt(s.nightsImaged), 'NIGHTS OUT']] as [string, string][]).forEach((st) => {
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.label;
      ctx.font = fnt(700, 14 * sc, f.label);
      setLS(ctx, 2 * sc);
      ctx.fillText(st[1], sx, yy);
      setLS(ctx, 0);
      ctx.fillStyle = t.ink;
      ctx.font = fnt(f.numW, 52 * sc, f.num);
      ctx.fillText(st[0], sx, yy + 22 * sc);
      yy += h * 0.155;
    });
  } else {
    vcStatRow(ctx, gm, t, [
      [fmtInt(s.uniqueObjects), 'TARGETS'],
      [fmtHM(s.totalIntegrationSeconds), 'INTEGRATION', t.heroColor],
      [fmtInt(s.nightsImaged), 'NIGHTS'],
    ], h * 0.835);
  }
  cardFooter(ctx, w, h, sc, t, pad);
}

/** Moon illumination (0 = new, 1 = full) for a date. */
function moonIllum(date: string): number {
  const d = parseDate(date);
  if (!d) {
    return 0.5;
  }
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const phase = (((days % 29.530588853) + 29.530588853) % 29.530588853) / 29.530588853;
  return (1 - Math.cos(phase * 6.283185)) / 2;
}

/** A small moon glyph with an offset clipped lit disk. */
function drawMoonGlyph(ctx: Ctx, x: number, y: number, r: number, illum: number, t: ResolvedTheme): void {
  ctx.save();
  ctx.fillStyle = hexA(t.label, 0.25);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.clip();
  ctx.fillStyle = '#f3ead2';
  ctx.beginPath();
  ctx.arc(x + (1 - illum) * 2 * r * 0.96, y, r, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** Moon Phases — every imaging night plotted against the lunar cycle. */
function drawMoonCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const gm = vcGeom(dims);
  const { w, h, sc, pad } = gm;
  const f = t.f;
  const s = model.summary;
  const nights = (s.activity || []).filter((a) => a.date);
  const ill = nights.map((a) => moonIllum(a.date));
  const darkN = ill.filter((v) => v < 0.35).length;
  const avg = ill.length ? ill.reduce((a, b) => a + b, 0) / ill.length : 0;
  const pct = ill.length ? Math.round((darkN / ill.length) * 100) : 0;
  vcHeader(ctx, gm, model, t, 'CHASING THE DARK', `${pct}% of nights near new moon`);
  const gx = pad;
  const gw = w - 2 * pad;
  const gy = h * (gm.wide ? 0.4 : gm.isStory ? 0.345 : 0.37);
  const gh = h * (gm.wide ? 0.3 : gm.isStory ? 0.33 : 0.3);
  const bgGrad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  bgGrad.addColorStop(0, hexA('#f3ead2', 0.13));
  bgGrad.addColorStop(0.5, 'rgba(0,0,0,0.26)');
  bgGrad.addColorStop(1, hexA('#f3ead2', 0.13));
  ctx.fillStyle = bgGrad;
  roundRect(ctx, gx, gy, gw, gh, 16 * sc);
  ctx.fill();
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.2 * sc;
  roundRect(ctx, gx, gy, gw, gh, 16 * sc);
  ctx.stroke();
  const phases = [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75, 1];
  phases.forEach((p, i) => {
    const x = gx + gw * (i / (phases.length - 1));
    drawMoonGlyph(ctx, x, gy - 24 * sc, 9 * sc, p, t);
  });
  ctx.fillStyle = hexA(t.accent, 0.07);
  ctx.fillRect(gx + gw * 0.325, gy, gw * 0.35, gh);
  ctx.strokeStyle = hexA(t.accent, 0.4);
  ctx.setLineDash([4 * sc, 6 * sc]);
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(gx + gw * 0.325, gy);
  ctx.lineTo(gx + gw * 0.325, gy + gh);
  ctx.moveTo(gx + gw * 0.675, gy);
  ctx.lineTo(gx + gw * 0.675, gy + gh);
  ctx.stroke();
  ctx.setLineDash([]);
  const rnd = mkRand(57);
  nights.forEach((a, i) => {
    const v = ill[i];
    const side = mkRand(i + 3)() > 0.5 ? 1 : -1;
    const x = gx + gw * (0.5 + side * v * 0.5 * 0.96);
    const y = gy + gh * (0.14 + rnd() * 0.72);
    const dark = v < 0.35;
    const col = dark ? t.accent : '#f3ead2';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 11 * sc);
    g.addColorStop(0, hexA(col, 0.55));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 11 * sc, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = hexA(col, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, 3.4 * sc, 0, 6.283);
    ctx.fill();
  });
  ctx.fillStyle = t.label;
  ctx.font = fnt(600, 13 * sc, f.label);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  setLS(ctx, 2 * sc);
  ctx.fillText('DARK WINDOW', gx + gw * 0.5, gy + gh + 10 * sc);
  ctx.textAlign = 'left';
  ctx.fillText('FULL', gx, gy + gh + 10 * sc);
  ctx.textAlign = 'right';
  ctx.fillText('FULL', gx + gw, gy + gh + 10 * sc);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
  vcStatRow(ctx, gm, t, [
    [`${pct}%`, 'DARK-SKY NIGHTS', t.accent],
    [`${Math.round(avg * 100)}%`, 'AVG MOON'],
    [fmtInt(nights.length), 'NIGHTS OUT'],
  ], h * (gm.wide ? 0.8 : 0.815));
  cardFooter(ctx, w, h, sc, t, pad);
}

/** Personal Bests — the top 5 most-imaged targets, ranked. */
function drawBestsCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const gm = vcGeom(dims);
  const { w, h, sc, pad } = gm;
  const f = t.f;
  vcHeader(ctx, gm, model, t, 'YOUR TOP 5', 'Personal Bests');
  const top5 = model.objects.slice().sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds).slice(0, 5);
  const top0 = h * (gm.isStory ? 0.3 : 0.32);
  const bot = h * (gm.isStory ? 0.865 : 0.85);
  const n = Math.max(1, top5.length);
  const rowH = (bot - top0) / n;
  top5.forEach((o, i) => {
    const cy = top0 + i * rowH + rowH / 2;
    const rightX = w - pad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = i === 0 ? t.heroColor : hexA(t.label, 0.85);
    const rankSize = (gm.isStory ? 82 : 68) * sc;
    ctx.font = fnt(f.numW, rankSize, f.num);
    ctx.fillText(String(i + 1), pad, cy);
    const tx = pad + ctx.measureText('5').width + 30 * sc;
    ctx.textAlign = 'right';
    ctx.fillStyle = i === 0 ? t.heroColor : t.ink;
    const hrSize = (gm.isStory ? 50 : 42) * sc;
    ctx.font = fnt(f.numW, hrSize, f.num);
    ctx.fillText(fmtHM(o.totalIntegrationSeconds), rightX, cy - 11 * sc);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, (gm.isStory ? 19 : 17) * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(`${o.sessions ? o.sessions.length : 0} NIGHTS`, rightX, cy + 24 * sc);
    setLS(ctx, 0);
    ctx.textAlign = 'left';
    ctx.fillStyle = t.ink;
    const nm = `${o.designation ? `${o.designation}  ·  ` : ''}${o.displayName}`;
    let ns = (gm.isStory ? 48 : 40) * sc;
    ctx.font = fnt(f.headW, ns, f.head);
    const nameMax = rightX - tx - 212 * sc;
    while (ctx.measureText(nm).width > nameMax && ns > 22 * sc) {
      ns -= 2 * sc;
      ctx.font = fnt(f.headW, ns, f.head);
    }
    ctx.fillText(nm, tx, cy - 12 * sc);
    ctx.fillStyle = t.sub;
    ctx.font = fnt(500, (gm.isStory ? 22 : 19) * sc, f.label);
    ctx.fillText(String(o.type || o.category || ''), tx, cy + 24 * sc);
    if (i < n - 1) {
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, top0 + (i + 1) * rowH);
      ctx.lineTo(w - pad, top0 + (i + 1) * rowH);
      ctx.stroke();
    }
  });
  cardFooter(ctx, w, h, sc, t, pad);
}

/** Timeline — first light to latest night, the whole journey charted. */
function drawTimelineCard(ctx: Ctx, dims: Dims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = Math.min(w, h) / 1080;
  const f = t.f;
  const s = model.summary;
  const wide = w > h * 1.15;
  const isStory = h > w * 1.3;
  const pad = w * (wide ? 0.06 : 0.085);
  const nm = cardName(model);
  const first = (nm || '').trim().split(' ')[0];
  const rangeStr = `${fmtDate(s.firstLight)}  →  ${fmtDate(s.latestSession)}`;

  drawGlyph(ctx, pad + 15 * sc, pad + 16 * sc, 15 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 30 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 40 * sc, pad + 17 * sc, t);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.sub;
  ctx.font = fnt(600, 18 * sc, f.label);
  ctx.fillText(nm, w - pad, pad + 17 * sc);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const titleY = h * (wide ? 0.2 : isStory ? 0.135 : 0.15);
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 20 * sc, f.label);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(`${first ? `${first.toUpperCase()}’S ` : ''}JOURNEY, NIGHT BY NIGHT`, pad, titleY);
  setLS(ctx, 0);
  ctx.fillStyle = t.ink;
  ctx.font = fnt(f.headW, (wide ? 56 : isStory ? 60 : 50) * sc, f.head);
  ctx.textBaseline = 'top';
  ctx.fillText(rangeStr, pad - 2 * sc, titleY + 18 * sc);

  const tlY = h * (wide ? 0.4 : isStory ? 0.34 : 0.36);
  const tlH = h * 0.3;
  drawTimeline(ctx, pad, tlY, w - 2 * pad, tlH, s.activity, t, sc);

  const nF = presentFilters(s.filterDistribution).length;
  const stats: [string, string][] = [
    [fmtHM(s.totalIntegrationSeconds), 'INTEGRATION'],
    [fmtInt(s.nightsImaged), 'NIGHTS'],
    [fmtInt(s.uniqueObjects), 'OBJECTS'],
    [fmtInt(nF), 'FILTERS'],
  ];
  const sy = h * 0.8;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, sy - 18 * sc);
  ctx.lineTo(w - pad, sy - 18 * sc);
  ctx.stroke();
  const colW = (w - pad * 2) / 4;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, (wide ? 46 : 50) * sc, f.num);
    ctx.fillText(st[0], cx, sy);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 14 * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(st[1], cx, sy + (wide ? 46 : 50) * sc + 14 * sc);
    setLS(ctx, 0);
  });
  ctx.textAlign = 'left';
  cardFooter(ctx, w, h, sc, t, pad);
}
// ---- motif art -------------------------------------------------------------

/** One star in a constellation figure (unit-box coords). */
interface SkyStar {
  id: string;
  x: number;
  y: number;
  m: number;
  c?: string;
}

/** A recognizable constellation figure (normalized unit-box coords). */
interface SkyFigDef {
  aspect: number;
  stars: SkyStar[];
  edges: [string, string][];
  nebula?: { at: string; r: number };
}

/** Three recognizable constellations for the big-constellation motif. */
const SKY_FIG: Readonly<Record<'orion' | 'cassiopeia' | 'ursa', SkyFigDef>> = {
  orion: {
    aspect: 0.6,
    stars: [
      { id: 'meissa', x: 0.52, y: 0.0, m: 0.32 },
      { id: 'betelgeuse', x: 0.8, y: 0.11, m: 1.0, c: '#ffb98e' },
      { id: 'bellatrix', x: 0.24, y: 0.17, m: 0.66, c: '#cfe0ff' },
      { id: 'mintaka', x: 0.34, y: 0.52, m: 0.6 },
      { id: 'alnilam', x: 0.5, y: 0.53, m: 0.74 },
      { id: 'alnitak', x: 0.66, y: 0.51, m: 0.62 },
      { id: 'saiph', x: 0.74, y: 0.96, m: 0.66 },
      { id: 'rigel', x: 0.16, y: 0.99, m: 1.0, c: '#bcd4ff' },
      { id: 'swordTop', x: 0.49, y: 0.66, m: 0.3 },
      { id: 'm42', x: 0.485, y: 0.74, m: 0.46 },
      { id: 'swordTip', x: 0.47, y: 0.84, m: 0.28 },
    ],
    edges: [
      ['meissa', 'betelgeuse'], ['meissa', 'bellatrix'], ['betelgeuse', 'bellatrix'],
      ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'],
      ['alnitak', 'saiph'], ['mintaka', 'rigel'], ['alnilam', 'swordTop'], ['swordTop', 'm42'], ['m42', 'swordTip'],
    ],
    nebula: { at: 'm42', r: 0.36 },
  },
  cassiopeia: {
    aspect: 3.05,
    stars: [
      { id: 'segin', x: 0.0, y: 0.32, m: 0.54 },
      { id: 'ruchbah', x: 0.26, y: 0.88, m: 0.58 },
      { id: 'gamma', x: 0.5, y: 0.16, m: 0.72 },
      { id: 'schedar', x: 0.75, y: 0.82, m: 0.74, c: '#ffd9a8' },
      { id: 'caph', x: 1.0, y: 0.06, m: 0.62 },
    ],
    edges: [['segin', 'ruchbah'], ['ruchbah', 'gamma'], ['gamma', 'schedar'], ['schedar', 'caph']],
  },
  ursa: {
    aspect: 2.45,
    stars: [
      { id: 'alkaid', x: 0.0, y: 0.46, m: 0.62 },
      { id: 'mizar', x: 0.17, y: 0.3, m: 0.66, c: '#dfe8ff' },
      { id: 'alioth', x: 0.34, y: 0.22, m: 0.66 },
      { id: 'megrez', x: 0.52, y: 0.31, m: 0.46 },
      { id: 'phecda', x: 0.57, y: 0.66, m: 0.58 },
      { id: 'merak', x: 0.85, y: 0.74, m: 0.62 },
      { id: 'dubhe', x: 0.93, y: 0.28, m: 0.86, c: '#ffd9a8' },
    ],
    edges: [
      ['alkaid', 'mizar'], ['mizar', 'alioth'], ['alioth', 'megrez'], ['megrez', 'dubhe'],
      ['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'],
    ],
  },
};

/** Places a constellation figure into the canvas, returning screen-space stars. */
function placeSkyFig(def: SkyFigDef, w: number, h: number, ax: number, ay: number, fw: number): {
  def: SkyFigDef;
  S: Record<string, { x: number; y: number; m: number; c?: string }>;
  boxH: number;
} {
  let boxW = fw * w;
  let boxH = boxW / def.aspect;
  const maxH = 0.46 * h;
  if (boxH > maxH) {
    boxH = maxH;
    boxW = boxH * def.aspect;
  }
  const ox = ax * w - boxW / 2;
  const oy = ay * h - boxH / 2;
  const S: Record<string, { x: number; y: number; m: number; c?: string }> = {};
  def.stars.forEach((s) => {
    S[s.id] = { x: ox + s.x * boxW, y: oy + s.y * boxH, m: s.m, c: s.c };
  });
  return { def, S, boxH };
}

/** Layered nebula glow around a point. */
function nebulaGlow(ctx: Ctx, x: number, y: number, R: number, t: ResolvedTheme): void {
  const layers: [number, string][] = [
    [R, hexA(t.accent || '#7b6ad8', 0.26)],
    [R * 0.66, hexA(t.heroColor || '#ff2a7b', 0.42)],
    [R * 0.34, 'rgba(150,235,255,0.36)'],
    [R * 0.15, 'rgba(255,255,255,0.92)'],
  ];
  for (const [lr, col] of layers) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, lr);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, lr, 0, 6.283);
    ctx.fill();
  }
}

/** Headliner Orion (+ M42 glow) with Cassiopeia and the Big Dipper. */
function drawBigConstellation(ctx: Ctx, w: number, h: number, t: ResolvedTheme): void {
  ctx.save();
  const sc = Math.min(w, h) / 560;
  const figs = [
    placeSkyFig(SKY_FIG.orion, w, h, 0.29, 0.52, 0.2),
    placeSkyFig(SKY_FIG.cassiopeia, w, h, 0.7, 0.23, 0.4),
    placeSkyFig(SKY_FIG.ursa, w, h, 0.71, 0.75, 0.42),
  ];
  for (const fig of figs) {
    const S = fig.S;
    const def = fig.def;
    const ss = Math.max(0.6, fig.boxH / 150);
    if (def.nebula) {
      const nb = S[def.nebula.at];
      nebulaGlow(ctx, nb.x, nb.y, fig.boxH * def.nebula.r, t);
    }
    ctx.lineWidth = 1.4 * sc;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = hexA(t.heroColor, 0.5);
    for (const e of def.edges) {
      const a = S[e[0]];
      const b = S[e[1]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const id in S) {
      const s = S[id];
      const r = (1.1 + s.m * 2.4) * ss;
      if (s.m > 0.6) {
        const gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4.5);
        gg.addColorStop(0, hexA(s.c || '#dfe8ff', 0.5));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 4.5, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = s.c || 'rgba(228,238,255,.95)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, 6.283);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** An orrery of elliptical orbits with a glowing core. */
function drawOrbits(ctx: Ctx, cx: number, cy: number, maxR: number, t: ResolvedTheme, seed: number): void {
  const rnd = mkRand(seed || 7);
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.2);
  g.addColorStop(0, hexA(t.heroColor, 0.5));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.2, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = hexA(t.gold, 0.9);
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 6.283);
  ctx.fill();
  const cols = [t.heroColor, t.accent, t.gold, '#cfe2ff', t.heroColor];
  for (let i = 1; i <= 5; i++) {
    const r = maxR * (0.2 + i * 0.158);
    const ry = r * 0.4;
    ctx.strokeStyle = hexA(t.label, 0.34);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, 6.283);
    ctx.stroke();
    const ang = rnd() * 6.283;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * ry;
    const pr = 5 + rnd() * 7;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** A full pinwheel galaxy tinted by the theme (or an explicit tint). */
function drawGalaxy(ctx: Ctx, cx: number, cy: number, R: number, t: ResolvedTheme, seed: number, tint?: string): void {
  const tn = tint || t.heroColor;
  const armLight = lerpHex(tn, '#ffffff', 0.62);
  const scatterLight = lerpHex(tn, '#ffffff', 0.78);
  const rnd = mkRand(seed || 11);
  ctx.save();
  const rot = (rnd() - 0.5) * 1.6;
  const tilt = 0.52 + rnd() * 0.14;
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, hexA(tn, 0.12));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, tilt);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
  g.addColorStop(0, 'rgba(255,243,219,0.30)');
  g.addColorStop(0.35, hexA(tn, 0.11));
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
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      const br = rnd();
      ctx.globalAlpha = (1 - tt) * 0.5 + 0.1;
      ctx.fillStyle = br > 0.84 ? tn : br > 0.62 ? armLight : br > 0.3 ? '#ffffff' : '#ffe9c4';
      ctx.beginPath();
      ctx.arc(px, py, rnd() * 1.6 + 0.4, 0, 6.283);
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
  g.addColorStop(0, 'rgba(255,250,236,0.95)');
  g.addColorStop(0.35, 'rgba(255,233,196,0.5)');
  g.addColorStop(1, 'rgba(255,233,196,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.26, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** A handful of soft nebula colour blobs across the frame. */
function drawNebulaBlobs(ctx: Ctx, w: number, h: number, t: ResolvedTheme, seed: number): void {
  const rnd = mkRand(seed || 5);
  const palette = ['#ff4d6d', '#22d3c5', '#4d8df0', t.gold, '#9b6cff'];
  for (let i = 0; i < 5; i++) {
    const x = rnd() * w;
    const y = h * (0.16 + rnd() * 0.5);
    const r = 150 + rnd() * 240;
    const c = palette[i % palette.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(c, 0.24));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/** A diffuse circular particle nebula shell. */
function drawNebulaShell(ctx: Ctx, cx: number, cy: number, R: number, t: ResolvedTheme, seed: number, ca?: string, cb?: string, dim = 1): void {
  const c1 = ca || t.heroColor;
  const c2 = cb || t.accent;
  const rnd = mkRand((seed || 5) + 53);
  const k = R / 120;
  const rot = (rnd() - 0.5) * 1.2;
  const sq = 0.78 + rnd() * 0.14;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.15);
  g.addColorStop(0, hexA(c1, 0.14 * dim));
  g.addColorStop(0.55, hexA('#9b6cff', 0.1 * dim));
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
    ctx.globalAlpha = (0.05 + rnd() * 0.1) * dim;
    ctx.fillStyle = out > 0.6 ? c2 : out > 0.3 ? '#9b6cff' : c1;
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
    ctx.globalAlpha = (0.14 + rnd() * 0.4) * dim;
    ctx.fillStyle = br > 0.93 ? '#ffffff' : out > 0.6 ? c2 : out > 0.32 ? '#9b6cff' : c1;
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * 1.7 + 0.4) * k, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.283;
    const rr = rnd() * R * 0.5;
    const sx = Math.cos(a) * rr;
    const sy = Math.sin(a) * rr * sq;
    const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7 * k);
    g2.addColorStop(0, `rgba(255,255,255,${(0.85 * dim).toFixed(2)})`);
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(sx, sy, 7 * k, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = dim;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.3 * k, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A glowing planetary-nebula shell around a white dwarf. */
function drawPlanetaryNebula(ctx: Ctx, cx: number, cy: number, R: number, t: ResolvedTheme, seed: number, ca?: string, cb?: string): void {
  const c1 = ca || t.heroColor;
  const c2 = cb || t.accent;
  const rnd = mkRand((seed || 9) + 7);
  const k = R / 120;
  const rot = (rnd() - 0.5) * 0.9;
  const sq = 0.74 + rnd() * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  g.addColorStop(0, hexA(c1, 0.26));
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
    ctx.fillStyle = br > 0.92 ? '#ffffff' : out > 0.62 ? c2 : out > 0.34 ? '#9b6cff' : c1;
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

/** A dense globular cluster swarm with a warm core. */
function drawGlobularSwarm(ctx: Ctx, cx: number, cy: number, R: number, t: ResolvedTheme, seed: number): void {
  const rnd = mkRand((seed || 3) + 13);
  const k = R / 130;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.62);
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
    ctx.fillStyle = br > 0.86 ? t.gold : br > 0.5 ? '#fff6e6' : br > 0.2 ? '#ffffff' : '#cfe2ff';
    ctx.beginPath();
    ctx.arc(px, py, (rnd() * (0.6 + near * 1.1) + 0.35) * k, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A lens aperture (iris) motif for the equipment slide. */
function drawAperture(ctx: Ctx, cx: number, cy: number, r: number, t: ResolvedTheme): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  g.addColorStop(0, hexA(t.heroColor, 0.3));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = hexA(t.label, 0.45);
  for (let i = 3; i >= 1; i--) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (r * 0.34 * i) / 1.05, 0, 6.283);
    ctx.stroke();
  }
  const blades = 7;
  const ar = r * 0.34;
  ctx.beginPath();
  for (let i = 0; i <= blades; i++) {
    const a = (i / blades) * 6.283 - 1.2;
    const x = cx + Math.cos(a) * ar;
    const y = cy + Math.sin(a) * ar;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = hexA(t.heroColor, 0.85);
  ctx.fill();
  ctx.strokeStyle = hexA(t.gold, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = hexA('#ffffff', 0.55);
  ctx.beginPath();
  ctx.arc(cx - ar * 0.28, cy - ar * 0.28, ar * 0.22, 0, 6.283);
  ctx.fill();
  ctx.restore();
}
// ---- carousel slides -------------------------------------------------------

/** One ranked row in a slide list. */
interface SlideRow {
  label: string;
  sub: string;
  value: number;
  valStr: string;
}

/** Big ranked list: large name + value on line 1, full-width bar on line 2. */
function cardListBig(ctx: Ctx, rows: SlideRow[], x: number, w: number, y0: number, y1: number, t: ResolvedTheme, sc: number, ranked: boolean): void {
  const n = rows.length;
  if (!n) {
    return;
  }
  const rowH = (y1 - y0) / n;
  const maxV = rows.reduce((m, r) => Math.max(m, r.value || 0), 0) || 1;
  rows.forEach((r, i) => {
    const ry = y0 + rowH * i;
    const nameY = ry + rowH * 0.38;
    ctx.textBaseline = 'middle';
    let nameX = x;
    let barX = x;
    let barW = w;
    if (ranked) {
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? t.heroColor : hexA(t.label, 0.7);
      ctx.font = fnt(t.f.numW, 40 * sc, t.f.num);
      ctx.fillText(String(i + 1), x, nameY);
      nameX = x + 52 * sc;
      barX = nameX;
      barW = w - (nameX - x);
    }
    ctx.fillStyle = t.ink;
    ctx.font = fnt(t.f.numW, 36 * sc, t.f.num);
    ctx.textAlign = 'right';
    ctx.fillText(r.valStr, x + w, nameY);
    const vw = ctx.measureText(r.valStr).width;
    ctx.textAlign = 'left';
    const maxW = x + w - vw - 34 * sc - nameX;
    let size = 44 * sc;
    ctx.font = fnt(t.f.headW, size, t.f.head);
    while (ctx.measureText(r.label).width > maxW && size > 24 * sc) {
      size -= 2 * sc;
      ctx.font = fnt(t.f.headW, size, t.f.head);
    }
    ctx.fillStyle = t.ink;
    ctx.fillText(r.label, nameX, nameY);
    if (r.sub && r.sub !== r.label) {
      const lw = ctx.measureText(r.label).width;
      ctx.fillStyle = t.sub;
      ctx.font = fnt(500, 31 * sc, t.f.label);
      if (lw + 20 * sc + ctx.measureText(r.sub).width <= maxW) {
        ctx.fillText(r.sub, nameX + lw + 20 * sc, nameY + 5 * sc);
      }
    }
    const by = ry + rowH * 0.74;
    ctx.fillStyle = hexA(t.label, 0.22);
    roundRect(ctx, barX, by - 5.5 * sc, barW, 11 * sc, 5.5 * sc);
    ctx.fill();
    ctx.fillStyle = t.heroColor;
    roundRect(ctx, barX, by - 5.5 * sc, Math.max(11 * sc, barW * ((r.value || 0) / maxV)), 11 * sc, 5.5 * sc);
    ctx.fill();
    if (i < n - 1) {
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, ry + rowH);
      ctx.lineTo(x + w, ry + rowH);
      ctx.stroke();
    }
  });
  ctx.textBaseline = 'alphabetic';
}

/** Slide-index prefix ("02   —   ") for non-cover slides. */
function slideIdx(dims: SlideDims): string {
  return dims.index != null && dims.index > 0 ? `${String(dims.index + 1).padStart(2, '0')}   —   ` : '';
}

/** Big-headline slide hero (eyebrow + giant number + sub). */
function slideHero(ctx: Ctx, dims: SlideDims, t: ResolvedTheme, eyebrow: string, numStr: string, sub: string): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const pad = w * 0.085;
  const f = t.f;
  const wide = w > h * 1.15;
  const eyY = h * (wide ? 0.215 : 0.135);
  const numY = h * (wide ? 0.24 : 0.15);
  const numS = (wide ? 130 : 168) * sc;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.label;
  ctx.textBaseline = 'alphabetic';
  ctx.font = fnt(700, 31 * sc, f.label);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(eyebrow, pad, eyY);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.textBaseline = 'top';
  ctx.font = fnt(f.numW, numS, f.num);
  ctx.fillText(numStr, pad - 3 * sc, numY);
  if (sub) {
    ctx.fillStyle = t.sub;
    ctx.font = fnt(600, 41 * sc, f.label);
    ctx.fillText(sub, pad, numY + numS + 10 * sc);
  }
}

/** Big-headline slide title (eyebrow + heading + sub). */
function slideBigTitle(ctx: Ctx, dims: SlideDims, t: ResolvedTheme, eyebrow: string, title: string, sub: string): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const pad = w * 0.085;
  const f = t.f;
  const wide = w > h * 1.15;
  const eyY = h * (wide ? 0.215 : 0.135);
  const tiY = h * (wide ? 0.245 : 0.155);
  const tiS = (wide ? 64 : 92) * sc;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.label;
  ctx.textBaseline = 'alphabetic';
  ctx.font = fnt(700, 31 * sc, f.label);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(eyebrow, pad, eyY);
  setLS(ctx, 0);
  ctx.fillStyle = t.ink;
  ctx.textBaseline = 'top';
  ctx.font = fnt(f.headW, tiS, f.head);
  ctx.fillText(title, pad - 3 * sc, tiY);
  if (sub) {
    ctx.fillStyle = t.sub;
    ctx.font = fnt(600, 41 * sc, f.label);
    ctx.fillText(sub, pad, h * (wide ? 0.4 : 0.29));
  }
}

/** Underlined section label for slides. */
function slideSectionLabel(ctx: Ctx, text: string, x: number, w: number, y: number, t: ResolvedTheme, sc: number): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 25 * sc, t.f.label);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(text, x, y);
  setLS(ctx, 0);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(x, y + 20 * sc);
  ctx.lineTo(x + w, y + 20 * sc);
  ctx.stroke();
}

/** Bigger, bolder per-filter chart for the share slides. */
function drawFilterChart(ctx: Ctx, x: number, y: number, w: number, chartH: number, dist: ShareFilterDistribution, t: ResolvedTheme, sc: number): void {
  const order = presentFilters(dist);
  if (!order.length) {
    return;
  }
  const max = order.reduce((a, k) => Math.max(a, dist[k] ?? 0), 1);
  const slot = w / order.length;
  const barW = Math.min(slot * 0.54, 84 * sc);
  const headroom = 52 * sc;
  const footroom = 50 * sc;
  const baseline = y + chartH - footroom;
  const usable = chartH - headroom - footroom;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, baseline);
  ctx.lineTo(x + w, baseline);
  ctx.stroke();
  order.forEach((k, i) => {
    const cx = x + slot * i + slot / 2;
    const v = (dist[k] ?? 0) / max;
    const bh = (0.12 + 0.88 * v) * usable;
    ctx.fillStyle = filterColor(k, t);
    roundRect(ctx, cx - barW / 2, baseline - bh, barW, bh, 9 * sc);
    ctx.fill();
    ctx.fillStyle = t.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = fnt(700, 33 * sc, t.f.num);
    ctx.fillText(`${fmtHours(dist[k] ?? 0)}h`, cx, baseline - bh - 16 * sc);
    ctx.fillStyle = filterColor(k, t);
    ctx.textBaseline = 'top';
    ctx.font = fnt(700, 31 * sc, t.f.label);
    ctx.fillText(SHARE_FILTER_META[k].label, cx, baseline + 17 * sc);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Cover-equivalent hours slide (identity + hero integration + filters). */
function hoursSlide(ctx: Ctx, dims: SlideDims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const s = model.summary;
  const f = t.f;
  const pad = w * 0.085;
  drawBigConstellation(ctx, w, h, t);
  ctx.textAlign = 'center';
  const id = objIdentity(model);
  ctx.textBaseline = 'alphabetic';
  if (id.name) {
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.headW, 56 * sc, f.head);
    setLS(ctx, 0);
    ctx.fillText(id.name, w / 2, h * 0.142);
  }
  if (id.handle) {
    ctx.fillStyle = t.accent;
    ctx.font = fnt(600, 36 * sc, f.label);
    setLS(ctx, 0.5 * sc);
    ctx.fillText(id.handle, w / 2, h * 0.186);
    setLS(ctx, 0);
  }
  const yda = parseDate(s.firstLight);
  const ydb = parseDate(s.latestSession);
  if (yda || ydb) {
    const yy1 = (yda ?? ydb)!.getUTCFullYear();
    const yy2 = (ydb ?? yda)!.getUTCFullYear();
    drawHeroYears(ctx, w, h * 0.228, sc, yy1, yy2, f, h > w * 1.3);
    ctx.textAlign = 'center';
  }
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 27 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('TOTAL INTEGRATION', w / 2, h * 0.355);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.font = fnt(f.headW, 176 * sc, f.head);
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtHM(s.totalIntegrationSeconds), w / 2, h * 0.45);
  ctx.fillStyle = t.sub;
  ctx.textBaseline = 'alphabetic';
  const statLine = `≈ ${fmtNights(s.totalIntegrationSeconds)} clear nights  ·  ${fmtInt(s.uniqueObjects)} objects  ·  ${fmtInt(s.nightsImaged)} nights`;
  let ss = 41 * sc;
  ctx.font = fnt(600, ss, f.label);
  while (ctx.measureText(statLine).width > w - 2 * pad && ss > 22 * sc) {
    ss -= 1 * sc;
    ctx.font = fnt(600, ss, f.label);
  }
  ctx.fillText(statLine, w / 2, h * 0.57);
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 27 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('LIGHT COLLECTED', w / 2, h * 0.715);
  setLS(ctx, 0);
  filterStacked(ctx, pad, h * 0.745, w - 2 * pad, 22 * sc, s.filterDistribution, t, sc);
  ctx.textAlign = 'left';
}

/** Top targets slide. */
function targetsSlide(ctx: Ctx, dims: SlideDims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const pad = w * 0.085;
  const s = model.summary;
  const wide = w > h * 1.15;
  drawNebulaShell(ctx, w * 0.22, h * 0.8, w * 0.4, t, 21, undefined, undefined, 0.26);
  const objs = model.objects.slice().sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  slideHero(ctx, dims, t, `${slideIdx(dims)}TARGETS CAPTURED`, fmtInt(objs.length), `${fmtHM(s.totalIntegrationSeconds)} total integration`);
  const rows: SlideRow[] = objs.slice(0, 5).map((o) => ({
    label: o.designation || o.displayName,
    sub: `${fmtInt(o.totalLightFrames)} frames`,
    value: o.totalIntegrationSeconds,
    valStr: fmtHM(o.totalIntegrationSeconds),
  }));
  slideSectionLabel(ctx, 'TOP TARGETS', pad, w - 2 * pad, h * (wide ? 0.46 : 0.33), t, sc);
  cardListBig(ctx, rows, pad, w - 2 * pad, h * (wide ? 0.5 : 0.37), h * (wide ? 0.93 : 0.91), t, sc, true);
}

/** Gear slide. */
function equipmentSlide(ctx: Ctx, dims: SlideDims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const pad = w * 0.085;
  const wide = w > h * 1.15;
  drawAperture(ctx, w * 0.81, h * 0.2, 82 * sc, t);
  const eq = model.equipment.slice().sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  const nCam = eq.filter((e) => e.kind === 'Camera').length;
  const nOpt = eq.length - nCam;
  slideHero(ctx, dims, t, `${slideIdx(dims)}GEAR USED`, fmtInt(eq.length), `${nCam} cameras   ·   ${nOpt} optics`);
  const rows: SlideRow[] = eq.slice(0, 5).map((e) => ({
    label: e.displayName,
    sub: e.kind,
    value: e.totalIntegrationSeconds,
    valStr: fmtHM(e.totalIntegrationSeconds),
  }));
  slideSectionLabel(ctx, 'TOP GEAR', pad, w - 2 * pad, h * (wide ? 0.46 : 0.33), t, sc);
  cardListBig(ctx, rows, pad, w - 2 * pad, h * (wide ? 0.5 : 0.37), h * (wide ? 0.93 : 0.91), t, sc, true);
}

/** Nights slide. */
function nightsSlide(ctx: Ctx, dims: SlideDims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const s = model.summary;
  const pad = w * 0.085;
  drawGalaxy(ctx, w * 0.74, h * 0.24, h * 0.3, t, 13);
  slideHero(ctx, dims, t, `${slideIdx(dims)}NIGHTS UNDER SKY`, fmtInt(s.nightsImaged), `${fmtInt(s.totalLightFrames)} light frames captured`);
  ctx.fillStyle = t.label;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = fnt(700, 24 * sc, t.f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('NIGHTLY ACTIVITY', pad, h * 0.53);
  setLS(ctx, 0);
  drawTimeline(ctx, pad, h * 0.575, w - 2 * pad, h * 0.26, s.activity, t, sc);
}

/** Light-breakdown slide. */
function lightSlide(ctx: Ctx, dims: SlideDims, model: ShareModel, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = dims.sc;
  const s = model.summary;
  const pad = w * 0.085;
  drawNebulaBlobs(ctx, w, h, t, 9);
  const totH = SHARE_FILTER_ORDER.reduce((a, k) => a + (s.filterDistribution[k] ?? 0), 0);
  const nF = presentFilters(s.filterDistribution).length;
  slideBigTitle(ctx, dims, t, `${slideIdx(dims)}LIGHT BREAKDOWN`, 'Light, by filter', `${fmtHours(totH)}h collected across ${nF} filters`);
  drawFilterChart(ctx, pad, h * 0.4, w - 2 * pad, h * 0.5, s.filterDistribution, t, sc);
}

/** The 5-slide carousel. */
const CAROUSEL = [hoursSlide, targetsSlide, equipmentSlide, nightsSlide, lightSlide];

/** Number of slides in the share carousel. */
export const CAROUSEL_SLIDE_COUNT = CAROUSEL.length;

/** Carousel chrome (wordmark + identity + slide dots + footer) on the full canvas. */
function drawCarouselChrome(ctx: Ctx, W: number, H: number, t: ResolvedTheme, index: number, model: ShareModel): void {
  const csc = Math.min(W, H) / 1080;
  const pad = 66 * csc;
  drawGlyph(ctx, pad + 13 * csc, pad + 13 * csc, 13 * csc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(t.f.headW, 30 * csc, t.f.head);
  setLS(ctx, 0);
  const id = objIdentity(model);
  let wx = pad + 34 * csc;
  if (id.name) {
    const poss = `${id.name}${/s$/i.test(id.name) ? '’' : '’s'} `;
    ctx.fillStyle = t.ink;
    ctx.fillText(poss, wx, pad + 14 * csc);
    wx += ctx.measureText(poss).width;
  }
  drawWordmark(ctx, wx, pad + 14 * csc, t);
  const gap = 16 * csc;
  const n = CAROUSEL_SLIDE_COUNT;
  const dx = W - pad - (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(dx + i * gap, pad + 14 * csc, (i === index ? 5 : 3.5) * csc, 0, 6.283);
    ctx.fillStyle = i === index ? t.accent : t.label;
    ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.accent;
  ctx.font = fnt(600, 20 * csc, t.f.label);
  ctx.fillText('celestory.dbastrosuite.com', W - pad, H - pad * 0.62);
  ctx.textAlign = 'left';
}

/** Renders carousel slide `index` for the given theme + format. */
export function renderCarouselSlide(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  themeId: ShareThemeId,
  index: number,
  formatId: ShareFormatId,
): void {
  const dims = SHARE_FORMATS[formatId] ?? SHARE_FORMATS.story;
  const W = dims.w;
  const H = dims.h;
  const sc = Math.min(W, H) / 1080;
  const t = resolveTheme(themeId);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, W, H);
  t.paint(ctx, W, H);
  scrim(ctx, W, H, t);
  if (index === 0) {
    drawConstellationField(ctx, W, H, t, 77);
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 2;
    roundRect(ctx, 14, 14, W - 28, H - 28, 22);
    ctx.stroke();
    if (formatId === 'landscape') {
      drawWide(ctx, { w: W, h: H }, model, t);
    } else {
      drawTall(ctx, { w: W, h: H }, model, t);
    }
    return;
  }
  legibilityScrim(ctx, W, H, themeId);
  drawConstellationField(ctx, W, H, t, 31 + index * 7);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, W - 28, H - 28, 22);
  ctx.stroke();
  (CAROUSEL[index] || CAROUSEL[0])(ctx, { w: W, h: H, sc, index }, model, t);
  drawCarouselChrome(ctx, W, H, t, index, model);
}
// ---- per-object + per-equipment cards --------------------------------------

/** Resolves the gear records used on an object. */
function objGearList(model: ShareModel, o: ShareModelObject): ShareModelEquipment[] {
  const byId = new Map(model.equipment.map((e) => [e.id, e]));
  return (o.sessions.flatMap((s) => s.equipmentIds))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .map((id) => byId.get(id))
    .filter((e): e is ShareModelEquipment => !!e);
}

/** Returns the rig line (optic + camera) for an object. */
function objRigLine(model: ShareModel, o: ShareModelObject): string[] {
  const gear = objGearList(model, o).slice().sort((a, b) => (b.totalIntegrationSeconds || 0) - (a.totalIntegrationSeconds || 0));
  const opt = gear.filter((e) => e.kind !== 'Camera')[0];
  const cam = gear.filter((e) => e.kind === 'Camera')[0];
  const names: string[] = [];
  if (opt) {
    names.push(opt.displayName);
  }
  if (cam) {
    names.push(cam.displayName);
  }
  if (!names.length && gear.length) {
    names.push(gear[0].displayName);
  }
  return names;
}

/** Distinct filter count for an object. */
function objFilterCount(o: ShareModelObject): number {
  return presentFilters(o.filterTotals).length;
}

/** Distinct night count for an object. */
function objNights(o: ShareModelObject): number {
  const days = new Set<string>();
  for (const s of o.sessions) {
    const k = dayKey(s.date);
    if (k) {
      days.add(k);
    }
  }
  return days.size || o.sessions.length;
}

/** Draws an image cover-fitted into a rounded rect. */
function drawCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const ir = img.width / img.height;
  const br = w / h;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;
  if (ir > br) {
    dh = h;
    dw = h * ir;
    dx = x - (dw - w) / 2;
    dy = y;
  } else {
    dw = w;
    dh = w / ir;
    dx = x;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Category-driven placeholder art inside a rounded banner. */
function objCategoryMotif(ctx: Ctx, x: number, y: number, w: number, h: number, t: ResolvedTheme, cat: string, seed: number, r: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(9,10,15,0.85)');
  g.addColorStop(1, 'rgba(2,3,8,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  starfield(ctx, ctx.canvas.width, ctx.canvas.height, 130, 0.7);
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const R = Math.min(w, h);
  if (cat === 'Galaxy') {
    drawGalaxy(ctx, cx, cy, R * 0.62, t, seed);
  } else if (cat === 'Nebula' || cat === 'Supernova Remnant') {
    drawNebulaShell(ctx, cx, cy, R * 0.44, t, seed);
  } else if (cat === 'Planetary Nebula') {
    drawPlanetaryNebula(ctx, cx, cy, R * 0.42, t, seed);
  } else if (cat === 'Globular Cluster') {
    drawGlobularSwarm(ctx, cx, cy, R * 0.42, t, seed);
  } else if (cat.indexOf('Cluster') !== -1 || cat === 'Star') {
    drawBigConstellation(ctx, ctx.canvas.width, ctx.canvas.height, t);
  } else {
    drawOrbits(ctx, cx, cy, R * 0.46, t, seed);
  }
  ctx.restore();
}

/** Bottom-scrim name block over the object banner. */
function bannerNameBlock(ctx: Ctx, o: ShareModelObject, x: number, y: number, w: number, h: number, t: ResolvedTheme, sc: number, r: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y + h * 0.34, 0, y + h);
  g.addColorStop(0, 'rgba(2,4,10,0)');
  g.addColorStop(1, 'rgba(2,4,10,0.86)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  const f = t.f;
  const lx = x + 32 * sc;
  const baseY = y + h - 32 * sc;
  const maxW = w - 64 * sc;
  ctx.textAlign = 'left';
  let nameSize = Math.min(76, w / 9) * sc;
  ctx.font = fnt(f.headW, nameSize, f.head);
  while (ctx.measureText(o.displayName).width > maxW && nameSize > 30 * sc) {
    nameSize -= 2 * sc;
    ctx.font = fnt(f.headW, nameSize, f.head);
  }
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(o.displayName, lx, baseY);
  if (o.designation) {
    ctx.fillStyle = t.accent;
    ctx.font = fnt(700, 21 * sc, f.label);
    setLS(ctx, 2 * sc);
    ctx.fillText(o.designation.toUpperCase(), lx, baseY - nameSize - 4 * sc);
    setLS(ctx, 0);
  }
}

/** Object/equipment card header bar (wordmark + identity). */
function objHeaderBar(ctx: Ctx, w: number, sc: number, t: ResolvedTheme, pad: number, idn: { name: string; handle: string }): void {
  const f = t.f;
  drawGlyph(ctx, pad + 14 * sc, pad + 14 * sc, 14 * sc);
  ctx.fillStyle = t.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = fnt(f.headW, 28 * sc, f.head);
  setLS(ctx, 0);
  drawWordmark(ctx, pad + 38 * sc, pad + 15 * sc, t);
  if (idn && (idn.name || idn.handle)) {
    const cy = pad + 15 * sc;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    let x = w - pad;
    const hd = idn.handle ? (idn.handle.charAt(0) === '@' ? idn.handle : `@${idn.handle}`) : '';
    if (hd) {
      ctx.fillStyle = t.sub;
      ctx.font = fnt(500, 15 * sc, f.label);
      ctx.fillText(hd, x, cy);
      x -= ctx.measureText(hd).width;
    }
    if (hd && idn.name) {
      ctx.fillStyle = t.sub;
      ctx.font = fnt(500, 15 * sc, f.label);
      x -= 9 * sc;
      ctx.fillText('·', x, cy);
      x -= ctx.measureText('·').width + 9 * sc;
    }
    if (idn.name) {
      ctx.fillStyle = t.ink;
      ctx.font = fnt(700, 17 * sc, f.head);
      ctx.fillText(idn.name, x, cy);
    }
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Single centered credit line for the bottom of object/equipment cards. */
function cardFooterLine(ctx: Ctx, w: number, footY: number, sc: number, t: ResolvedTheme): void {
  const f = t.f;
  ctx.textBaseline = 'alphabetic';
  setLS(ctx, 0.4 * sc);
  ctx.font = fnt(600, 16 * sc, f.label);
  const pre = 'Created using Celestory at ';
  const url = 'celestory.dbastrosuite.com';
  ctx.textAlign = 'left';
  const wPre = ctx.measureText(pre).width;
  const wUrl = ctx.measureText(url).width;
  const startX = w / 2 - (wPre + wUrl) / 2;
  ctx.fillStyle = t.label;
  ctx.fillText(pre, startX, footY);
  ctx.fillStyle = t.accent;
  ctx.fillText(url, startX + wPre, footY);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/** Portrait/square per-object card. */
function drawObjectTall(ctx: Ctx, dims: Dims, model: ShareModel, o: ShareModelObject, t: ResolvedTheme, img?: HTMLImageElement | null): void {
  const w = dims.w;
  const h = dims.h;
  const sc = w / 1080;
  const f = t.f;
  const isStory = h > w * 1.3;
  const pad = w * 0.075;
  const id = objIdentity(model);
  const footY = h - pad * 0.62;
  objHeaderBar(ctx, w, sc, t, pad, id);
  const bx = pad;
  const bw = w - 2 * pad;
  const by = pad + 52 * sc;
  const bh = isStory ? h * 0.33 : h * 0.295;
  const br = 22 * sc;
  if (img) {
    drawCover(ctx, img, bx, by, bw, bh, br);
  } else {
    objCategoryMotif(ctx, bx, by, bw, bh, t, o.category || 'Other', String(o.id || '').length * 37 + 11, br);
  }
  bannerNameBlock(ctx, o, bx, by, bw, bh, t, sc, br);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, br);
  ctx.stroke();
  const A = { heroLab: 0.455, heroNum: 0.508, heroSub: 0.552, row: 0.618, dates: 0.728, light: 0.796, rig: 0.905 };
  ctx.textAlign = 'center';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 18 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TOTAL INTEGRATION', w / 2, h * A.heroLab);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.font = fnt(f.numW, (isStory ? 132 : 100) * sc, f.num);
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtHM(o.totalIntegrationSeconds), w / 2, h * A.heroNum);
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, 19 * sc, f.label);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`≈ ${fmtNights(o.totalIntegrationSeconds)} clear nights`, w / 2, h * A.heroSub);
  const stats: [string, string][] = [
    [fmtInt(o.totalLightFrames), 'FRAMES'],
    [fmtInt(objNights(o)), 'NIGHTS'],
    [fmtInt(objFilterCount(o)), 'FILTERS'],
  ];
  const rowY = h * A.row;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, rowY);
  ctx.lineTo(w - pad, rowY);
  ctx.stroke();
  const colW = (w - 2 * pad) / 3;
  const sNum = (isStory ? 60 : 50) * sc;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, sNum, f.num);
    ctx.fillText(st[0], cx, rowY + 22 * sc);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 14 * sc, f.label);
    setLS(ctx, 1.5 * sc);
    ctx.fillText(st[1], cx, rowY + 22 * sc + sNum + 11 * sc);
    setLS(ctx, 0);
  });
  const dy = h * A.dates;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 14 * sc, f.label);
  setLS(ctx, 2 * sc);
  ctx.fillText('FIRST LIGHT', w * 0.28, dy - 34 * sc);
  ctx.fillText('LATEST', w * 0.72, dy - 34 * sc);
  setLS(ctx, 0);
  ctx.fillStyle = t.ink;
  ctx.font = fnt(f.numW, (isStory ? 36 : 30) * sc, f.num);
  ctx.fillText(fmtDate(o.firstLight), w * 0.28, dy);
  ctx.fillText(fmtDate(o.latestSession), w * 0.72, dy);
  ctx.fillStyle = t.accent;
  ctx.font = fnt(400, 30 * sc, f.label);
  ctx.fillText('→', w / 2, dy - 8 * sc);
  const lY = h * A.light;
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 17 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('LIGHT COLLECTED', w / 2, lY);
  setLS(ctx, 0);
  filterStacked(ctx, pad, lY + 22 * sc, w - 2 * pad, 18 * sc, o.filterTotals, t, sc, true);
  const rig = objRigLine(model, o);
  if (rig.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = t.sub;
    ctx.font = fnt(600, 20 * sc, f.label);
    ctx.fillText(rig.join('   ·   '), w / 2, h * A.rig);
  }
  cardFooterLine(ctx, w, footY, sc, t);
}

/** Landscape per-object card. */
function drawObjectWide(ctx: Ctx, dims: Dims, model: ShareModel, o: ShareModelObject, t: ResolvedTheme, img?: HTMLImageElement | null): void {
  const w = dims.w;
  const h = dims.h;
  const sc = w / 1200;
  const f = t.f;
  const pad = w * 0.05;
  const id = objIdentity(model);
  objHeaderBar(ctx, w, sc, t, pad, id);
  const bx = pad;
  const by = pad + 46 * sc;
  const bw = w * 0.42;
  const bh = h - by - pad;
  const br = 20 * sc;
  if (img) {
    drawCover(ctx, img, bx, by, bw, bh, br);
  } else {
    objCategoryMotif(ctx, bx, by, bw, bh, t, o.category || 'Other', String(o.id || '').length * 37 + 11, br);
  }
  bannerNameBlock(ctx, o, bx, by, bw, bh, t, sc, br);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, br);
  ctx.stroke();
  const rx = bx + bw + pad * 0.85;
  const rw = w - pad - rx;
  const y = by + 4 * sc;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 16 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText('TOTAL INTEGRATION', rx, y);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.textBaseline = 'top';
  ctx.font = fnt(f.headW, 84 * sc, f.head);
  ctx.fillText(fmtHM(o.totalIntegrationSeconds), rx - 2 * sc, y + 18 * sc);
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, 17 * sc, f.label);
  ctx.fillText(`≈ ${fmtNights(o.totalIntegrationSeconds)} clear nights   ·   ${fmtRange(o.firstLight, o.latestSession)}`, rx, y + 18 * sc + 84 * sc + 12 * sc);
  const stats: [string, string][] = [
    [fmtInt(o.totalLightFrames), 'FRAMES'],
    [fmtInt(objNights(o)), 'NIGHTS'],
    [fmtInt(objFilterCount(o)), 'FILTERS'],
  ];
  const sColW = rw / 3;
  const stTop = by + bh * 0.42;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx, stTop - 22 * sc);
  ctx.lineTo(rx + rw, stTop - 22 * sc);
  ctx.stroke();
  stats.forEach((st, i) => {
    const cx = rx + sColW * i;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, 46 * sc, f.num);
    ctx.fillText(st[0], cx, stTop);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 15 * sc, f.label);
    setLS(ctx, 1.5 * sc);
    ctx.fillText(st[1], cx + 1 * sc, stTop + 54 * sc);
    setLS(ctx, 0);
  });
  sectionLabel(ctx, 'LIGHT COLLECTED', rx, by + bh * 0.6, t, sc);
  drawFilterBars(ctx, rx, by + bh * 0.6 + 34 * sc, rw, bh * 0.3, o.filterTotals, t, sc);
  const rig = objRigLine(model, o);
  const footLeft = rig.length ? `Captured with ${rig.join(' · ')}` : '';
  ctx.textBaseline = 'alphabetic';
  if (footLeft) {
    ctx.textAlign = 'left';
    ctx.fillStyle = t.sub;
    ctx.font = fnt(600, 16 * sc, f.label);
    setLS(ctx, 0.3 * sc);
    ctx.fillText(footLeft, pad, h - pad * 0.46);
    setLS(ctx, 0);
  }
  cardFooterLine(ctx, w, h - pad * 0.46, sc, t);
}

/** Renders a per-object share card. */
export function renderObjectShareCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  o: ShareModelObject,
  themeId: ShareThemeId,
  formatId: ShareFormatId,
  img?: HTMLImageElement | null,
): void {
  const dims = SHARE_FORMATS[formatId] ?? SHARE_FORMATS.story;
  const t = resolveTheme(themeId);
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, dims.w, dims.h);
  t.paint(ctx, dims.w, dims.h);
  scrim(ctx, dims.w, dims.h, t);
  drawConstellationField(ctx, dims.w, dims.h, t, 53);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, dims.w - 28, dims.h - 28, 22);
  ctx.stroke();
  if (formatId === 'landscape') {
    drawObjectWide(ctx, dims, model, o, t, img);
  } else {
    drawObjectTall(ctx, dims, model, o, t, img);
  }
}

/** Portrait/square per-equipment card. */
function drawEquipTall(ctx: Ctx, dims: Dims, model: ShareModel, e: ShareModelEquipment, t: ResolvedTheme): void {
  const w = dims.w;
  const h = dims.h;
  const sc = w / 1080;
  const f = t.f;
  const isStory = h > w * 1.3;
  const pad = w * 0.075;
  const id = objIdentity(model);
  const footY = h - pad * 0.62;
  const byId = new Map(model.objects.map((o) => [o.id, o]));
  const objs = (e.objectIds || [])
    .map((x) => byId.get(x))
    .filter((o): o is ShareModelObject => !!o)
    .sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  const nightSet = new Set<string>();
  objs.forEach((o) => o.sessions.forEach((s) => {
    if ((s.equipmentIds || []).indexOf(e.id) !== -1 && s.date) {
      nightSet.add(s.date);
    }
  }));
  const nights = nightSet.size;
  objHeaderBar(ctx, w, sc, t, pad, id);
  const titleY = pad + (isStory ? 132 : 112) * sc;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.accent;
  ctx.font = fnt(700, 18 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.fillText(e.kind.toUpperCase(), pad, titleY);
  setLS(ctx, 0);
  let ns = (isStory ? 64 : 54) * sc;
  ctx.fillStyle = t.ink;
  ctx.font = fnt(f.headW, ns, f.head);
  while (ctx.measureText(e.displayName).width > w - 2 * pad && ns > 28 * sc) {
    ns -= 2 * sc;
    ctx.font = fnt(f.headW, ns, f.head);
  }
  ctx.fillText(e.displayName, pad, titleY + ns + 4 * sc);
  if (e.detail) {
    ctx.fillStyle = t.sub;
    ctx.font = fnt(500, 18 * sc, f.label);
    ctx.fillText(e.detail, pad, titleY + ns + 34 * sc);
  }
  const A = {
    heroLab: isStory ? 0.275 : 0.31, heroNum: isStory ? 0.335 : 0.375, heroSub: isStory ? 0.385 : 0.425,
    row: isStory ? 0.455 : 0.495, listLab: isStory ? 0.555 : 0.6, list: isStory ? 0.59 : 0.635,
  };
  ctx.textAlign = 'center';
  ctx.fillStyle = t.label;
  ctx.font = fnt(700, 18 * sc, f.label);
  setLS(ctx, 3 * sc);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TOTAL INTEGRATION', w / 2, h * A.heroLab);
  setLS(ctx, 0);
  ctx.fillStyle = t.heroColor;
  ctx.font = fnt(f.numW, (isStory ? 120 : 92) * sc, f.num);
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtHM(e.totalIntegrationSeconds), w / 2, h * A.heroNum);
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, 18 * sc, f.label);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ACTIVE ${fmtRange(e.firstLight, e.latestSession).toUpperCase()}`, w / 2, h * A.heroSub);
  const stats: [string, string][] = [
    [fmtInt(e.totalLightFrames), 'FRAMES'],
    [fmtInt(e.objectCount), 'OBJECTS'],
    [fmtInt(nights), 'NIGHTS'],
  ];
  const rowY = h * A.row;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, rowY);
  ctx.lineTo(w - pad, rowY);
  ctx.stroke();
  const colW = (w - 2 * pad) / 3;
  const sNum = (isStory ? 56 : 48) * sc;
  stats.forEach((st, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(f.numW, sNum, f.num);
    ctx.fillText(st[0], cx, rowY + 20 * sc);
    ctx.fillStyle = t.label;
    ctx.font = fnt(700, 14 * sc, f.label);
    setLS(ctx, 1.5 * sc);
    ctx.fillText(st[1], cx, rowY + 20 * sc + sNum + 10 * sc);
    setLS(ctx, 0);
  });
  if (objs.length) {
    slideSectionLabel(ctx, 'MOST IMAGED WITH THIS', pad, w - 2 * pad, h * A.listLab, t, sc);
    const rows: SlideRow[] = objs.slice(0, 5).map((o) => ({
      label: o.designation || o.displayName,
      sub: `${fmtInt(o.totalLightFrames)} frames`,
      value: o.totalIntegrationSeconds,
      valStr: fmtHM(o.totalIntegrationSeconds),
    }));
    cardListBig(ctx, rows, pad, w - 2 * pad, h * A.list, h * 0.905, t, sc, true);
  }
  cardFooterLine(ctx, w, footY, sc, t);
}

/** Renders a per-equipment share card (story / square only). */
export function renderEquipmentShareCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  e: ShareModelEquipment,
  themeId: ShareThemeId,
  formatId: ShareFormatId,
): void {
  const dims = SHARE_FORMATS[formatId] ?? SHARE_FORMATS.story;
  const t = resolveTheme(themeId);
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, dims.w, dims.h);
  t.paint(ctx, dims.w, dims.h);
  scrim(ctx, dims.w, dims.h, t);
  drawConstellationField(ctx, dims.w, dims.h, t, 41);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, dims.w - 28, dims.h - 28, 22);
  ctx.stroke();
  drawEquipTall(ctx, dims, model, e, t);
}











