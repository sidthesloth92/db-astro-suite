/**
 * Client-side share-card renderer. Paints the journey summary to a real
 * <canvas> in four DB-Astro-adhering designs (DB-Astro + Observatory + Starfield
 * + Nebula) and three social formats, then the modal downloads it as a PNG.
 * Deterministic backgrounds; runs in the browser only.
 */
import { BRAND_CYAN, BRAND_PINK } from '../models/brand.constants';
import type { CelestoryLedger, LedgerEquipment, LedgerObject } from '../models/ledger.model';
import type {
  EquipmentShareData,
  ObjectShareData,
  ShareBackgroundId,
  ShareBackgroundMeta,
  ShareCardData,
  ShareCarouselData,
  ShareFormatId,
  ShareFormatMeta,
  ShareListRow,
  ShareThemeId,
  ShareThemeMeta,
} from '../models/share.types';
import { hexLerp } from './color.util';
import { filterColor, filterLabel } from './filter-color.util';
import { formatCount, formatDuration } from './format.util';
import { moonIllumination } from './moon-phase.util';

/** Internal theme palette + base (gradient/ambient) painter — no motifs. */
interface ThemePalette {
  ink: string;
  sub: string;
  faint: string;
  accent: string;
  hero: string;
  /** Warm secondary accent (planet rings, orbit dots). */
  gold: string;
  line: string;
  barBg: string;
  glyph: string;
  glyphDot: string;
  /** Light-scrim theme (light background + dark ink): inverts the legibility scrim. */
  light?: boolean;
  /** Paints only the colour-mood base (gradient + ambient washes). */
  base: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

/** Fixed guide-star marker colours (red + teal), per the design references. */
const MARK_RED = '#ff5a6e';
const MARK_TEAL = '#37d9bd';

/** Social formats. */
export const SHARE_FORMATS: Record<ShareFormatId, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  landscape: { w: 1200, h: 675 },
};

/** Format picker metadata. */
export const SHARE_FORMAT_LIST: ShareFormatMeta[] = [
  { id: 'square', label: 'Square', sub: '1:1 · post', w: 1080, h: 1080 },
  { id: 'story', label: 'Story', sub: '9:16 · story', w: 1080, h: 1920 },
  { id: 'landscape', label: 'Landscape', sub: '16:9 · X / OG', w: 1200, h: 675 },
];

/** Theme picker metadata (16 named themes — colour swatch chips). */
export const SHARE_THEME_LIST: ShareThemeMeta[] = [
  { id: 'dark', label: 'Observatory', swatch: 'linear-gradient(140deg,#0a0e16,#05070c 70%)' },
  { id: 'star', label: 'Starfield', swatch: 'linear-gradient(140deg,#262a64,#0a0b22 78%)' },
  { id: 'astro', label: 'Nebula', swatch: 'linear-gradient(140deg,#b0269a,#3a1170 55%,#10081f)' },
  { id: 'galaxy', label: 'Galaxy', swatch: 'linear-gradient(140deg,#8a45f0,#2a1450 58%,#0a0618)' },
  { id: 'blackhole', label: 'Black Hole', swatch: 'radial-gradient(circle at 50% 44%,#ffb24d,#7a1e08 42%,#05050a 74%)' },
  { id: 'aurora', label: 'Aurora', swatch: 'linear-gradient(180deg,#2c1656,#ff8fd0 58%,#5fe8a0)' },
  { id: 'blueprint', label: 'Blueprint', swatch: 'linear-gradient(140deg,#10519e,#0a2350 58%,#030c20)' },
  { id: 'atlas', label: 'Star Atlas', swatch: 'linear-gradient(140deg,#2b3a72,#141a3c 58%,#080a1a)' },
  { id: 'eclipse', label: 'Eclipse', swatch: 'radial-gradient(circle at 50% 42%,#0a0a10 0 26%,#fff 27% 31%,#3a3a4a 45%,#0a0a10 70%)' },
  { id: 'milkyway', label: 'Milky Way', swatch: 'linear-gradient(135deg,#0b1026,#caa36b 48%,#3a2a4a 60%,#0b1026)' },
  { id: 'comet', label: 'Comet', swatch: 'linear-gradient(225deg,#bff3ff,#1d8cb8 28%,#0a1a30 75%)' },
  { id: 'deepfield', label: 'Deep Field', swatch: 'radial-gradient(circle at 30% 30%,#caa9ff 0 6%,transparent 7%),radial-gradient(circle at 68% 60%,#ffd9b0 0 5%,transparent 6%),radial-gradient(circle at 55% 25%,#9fc6ff 0 4%,transparent 5%),#06060a' },
  { id: 'filmneg', label: 'Film Negative', swatch: 'linear-gradient(180deg,#111 0 12%,#e9e4da 12% 88%,#111 88%)' },
  { id: 'obslog', label: "Observer's Log", swatch: 'repeating-linear-gradient(180deg,#efe5cf 0 10px,#e2d5b8 10px 11px)' },
  { id: 'patch', label: 'Mission Patch', swatch: 'linear-gradient(180deg,#1c2c52 0 55%,#ff8c42 55% 70%,#b8472e 70% 85%,#27355e 85%)' },
  { id: 'moonlight', label: 'Moonlight', swatch: 'radial-gradient(circle at 68% 26%,#fff 0 9%,#9db8e8 22%,#34507e 55%,#101c33)' },
];

/** Background picker metadata (dropdown). Drawn in the chosen palette's colours. */
export const SHARE_BACKGROUND_LIST: ShareBackgroundMeta[] = [
  { id: 'observatory', label: 'Observatory', sub: 'Globe · grid · constellations' },
  { id: 'starfield', label: 'Starfield', sub: 'Dense stars · constellations' },
  { id: 'nebula', label: 'Nebula', sub: 'Soft colour clouds' },
  { id: 'galaxy', label: 'Galaxy', sub: 'A bright spiral pinwheel' },
  { id: 'blackhole', label: 'Black Hole', sub: 'Glowing accretion disk' },
  { id: 'aurora', label: 'Aurora', sub: 'Vector aurora curtains' },
  { id: 'milkyway', label: 'Milky Way', sub: 'The galactic core band' },
  { id: 'blueprint', label: 'Blueprint', sub: 'Optical schematic grid' },
  { id: 'atlas', label: 'Star Atlas', sub: 'Charted coordinate sky' },
  { id: 'eclipse', label: 'Eclipse', sub: 'Totality + corona ring' },
  { id: 'comet', label: 'Comet', sub: 'A comet streaking past' },
  { id: 'deepfield', label: 'Deep Field', sub: 'Scattered far galaxies' },
  { id: 'patch', label: 'Mission Patch', sub: 'Concentric mission arcs' },
  { id: 'moonlight', label: 'Moonlight', sub: 'A luminous waxing moon' },
  { id: 'filmneg', label: 'Film Negative', sub: 'A film-strip frame' },
  { id: 'obslog', label: "Observer's Log", sub: 'A dark ruled logbook' },
];

// ---- canvas helpers --------------------------------------------------------

function radialWash(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function mkRand(seed: number): () => number {
  let s = seed || 987654321;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

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

function constellations(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, line: string, star: string, count: number): void {
  const rnd = mkRand(seed);
  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.8;
  for (let c = 0; c < count; c++) {
    let x = rnd() * w;
    let y = rnd() * h;
    const n = 3 + Math.floor(rnd() * 4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const nx = x + (rnd() - 0.5) * w * 0.22;
      const ny = y + (rnd() - 0.5) * h * 0.16;
      ctx.lineTo(nx, ny);
      ctx.save();
      ctx.fillStyle = star;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.9, 0, 6.283);
      ctx.fill();
      ctx.restore();
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }
  ctx.restore();
}

function coordGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, alpha: number): void {
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
  ctx.restore();
}

function reticle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number): void {
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
  ctx.restore();
}

// ---- themes ----------------------------------------------------------------

/** Fill the canvas with a top→bottom (or diagonal) linear gradient. */
function linGrad(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][], diagonal = false): void {
  const g = ctx.createLinearGradient(0, 0, diagonal ? w * 0.4 : 0, h);
  for (const [at, col] of stops) {
    g.addColorStop(at, col);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The 16 named share-card themes. Each bundles a full palette + a base painter
 * (gradient/ambient mood). Its motif is drawn on top via THEME_MOTIF. Ported
 * from the Celestory design (`SHARE_THEMES`).
 */
const THEMES: Record<ShareThemeId, ThemePalette> = {
  dark: {
    ink: '#eef2f8', sub: '#8a96ad', faint: 'rgba(150,170,210,.5)',
    accent: '#34e3d0', hero: '#34e3d0', gold: '#e7c07b',
    line: 'rgba(150,170,210,.16)', barBg: 'rgba(150,170,210,.10)', glyph: '#34e3d0', glyphDot: '#e7c07b',
    base: (ctx, w, h) => {
      linGrad(ctx, w, h, [[0, '#0a0f18'], [0.55, '#070a11'], [1, '#05070c']], true);
      radialWash(ctx, w * 0.82, h * 0.04, Math.max(w, h) * 0.7, 'rgba(52,227,208,.10)');
      radialWash(ctx, w * 0.06, h * 0.1, Math.max(w, h) * 0.6, 'rgba(120,92,220,.10)');
    },
  },
  star: {
    ink: '#f3f3ff', sub: '#a8a6d2', faint: 'rgba(200,196,240,.5)',
    accent: '#ffd98a', hero: '#ffd98a', gold: '#ffd98a',
    line: 'rgba(200,196,240,.2)', barBg: 'rgba(200,196,240,.13)', glyph: '#ffd98a', glyphDot: '#b9a6ff',
    base: (ctx, w, h) => {
      linGrad(ctx, w, h, [[0, '#1f2358'], [0.5, '#13153a'], [1, '#080a1e']], true);
      radialWash(ctx, w * 0.72, h * 0.1, Math.max(w, h) * 0.6, 'rgba(120,110,235,.22)');
    },
  },
  astro: {
    ink: '#fdeffb', sub: '#d3aee0', faint: 'rgba(235,200,245,.55)',
    accent: '#ff6ad5', hero: '#6cf0e0', gold: '#ffd36a',
    line: 'rgba(240,200,245,.22)', barBg: 'rgba(240,200,245,.15)', glyph: '#ff6ad5', glyphDot: '#6cf0e0',
    base: (ctx, w, h) => {
      linGrad(ctx, w, h, [[0, '#1a0830'], [0.6, '#120726'], [1, '#0a0418']], true);
      radialWash(ctx, w * 0.86, h * 0.05, Math.max(w, h) * 0.6, 'rgba(200,40,170,.16)');
    },
  },
  galaxy: {
    ink: '#f7f2ff', sub: '#e3d6f7', faint: 'rgba(220,200,250,.55)',
    accent: '#c98bff', hero: '#d6a8ff', gold: '#ffce6b',
    line: 'rgba(210,180,255,.20)', barBg: 'rgba(210,180,255,.12)', glyph: '#c98bff', glyphDot: '#ffce6b',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#2a1450'], [0.55, '#150a2e'], [1, '#070312']], true),
  },
  blackhole: {
    ink: '#fdf3e8', sub: '#f0dcc6', faint: 'rgba(245,210,170,.55)',
    accent: '#ff9b3d', hero: '#ffb24d', gold: '#ffd98a',
    line: 'rgba(255,180,120,.18)', barBg: 'rgba(255,180,120,.10)', glyph: '#ff9b3d', glyphDot: '#ffd98a',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#0c0a12'], [0.5, '#08060e'], [1, '#040409']]),
  },
  aurora: {
    ink: '#fdf4ff', sub: '#ecdcf5', faint: 'rgba(235,215,245,.55)',
    accent: '#5fffc2', hero: '#ff9fd8', gold: '#ffc7ec',
    line: 'rgba(220,180,240,.22)', barBg: 'rgba(220,180,240,.12)', glyph: '#5fffc2', glyphDot: '#ff9fd8',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#14082a'], [1, '#0a0418']]),
  },
  blueprint: {
    ink: '#eaf4ff', sub: '#bcd6f5', faint: 'rgba(180,214,245,.55)',
    accent: '#6cc6ff', hero: '#7fd4ff', gold: '#ffd98a',
    line: 'rgba(150,200,255,.24)', barBg: 'rgba(150,200,255,.12)', glyph: '#6cc6ff', glyphDot: '#ffd98a',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#0c2c63'], [0.55, '#081b40'], [1, '#030c1f']], true),
  },
  atlas: {
    ink: '#fbf3e3', sub: '#d8cba8', faint: 'rgba(230,215,180,.55)',
    accent: '#e7c07b', hero: '#ffd98a', gold: '#ffd98a',
    line: 'rgba(231,192,123,.26)', barBg: 'rgba(231,192,123,.13)', glyph: '#e7c07b', glyphDot: '#9fc6ff',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#1c2550'], [0.55, '#10142f'], [1, '#070a18']], true),
  },
  eclipse: {
    ink: '#f0f0f6', sub: '#cfcfdc', faint: 'rgba(220,220,235,.5)',
    accent: '#e6e6f0', hero: '#ffffff', gold: '#cfcfdc',
    line: 'rgba(220,220,235,.20)', barBg: 'rgba(220,220,235,.10)', glyph: '#e6e6f0', glyphDot: '#9d9dad',
    base: (ctx, w, h) => {
      ctx.fillStyle = '#08080d';
      ctx.fillRect(0, 0, w, h);
    },
  },
  milkyway: {
    ink: '#ffeed2', sub: '#d8c2a0', faint: 'rgba(255,210,150,.5)',
    accent: '#ffc06b', hero: '#ffd9a0', gold: '#ffd98a',
    line: 'rgba(255,200,140,.20)', barBg: 'rgba(255,200,140,.10)', glyph: '#ffc06b', glyphDot: '#9fc6ff',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#0a0e24'], [1, '#070514']]),
  },
  comet: {
    ink: '#dff4ff', sub: '#a8c6d6', faint: 'rgba(150,210,245,.5)',
    accent: '#5fd8ff', hero: '#8fe8ff', gold: '#bfeec9',
    line: 'rgba(130,210,245,.22)', barBg: 'rgba(130,210,245,.11)', glyph: '#5fd8ff', glyphDot: '#bfeec9',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#08182e'], [1, '#050a18']]),
  },
  deepfield: {
    ink: '#efe9dd', sub: '#cabfae', faint: 'rgba(216,185,255,.5)',
    accent: '#d8b9ff', hero: '#f0e6d8', gold: '#ffd9b0',
    line: 'rgba(216,185,255,.18)', barBg: 'rgba(216,185,255,.09)', glyph: '#d8b9ff', glyphDot: '#ffd9b0',
    base: (ctx, w, h) => {
      ctx.fillStyle = '#050509';
      ctx.fillRect(0, 0, w, h);
    },
  },
  filmneg: {
    ink: '#2a2620', sub: '#5b5246', faint: 'rgba(45,38,28,.55)',
    accent: '#c2452b', hero: '#b03a22', gold: '#8c6b2f',
    line: 'rgba(45,38,28,.28)', barBg: 'rgba(45,38,28,.08)', glyph: '#c2452b', glyphDot: '#221d15', light: true,
    base: (ctx, w, h) => {
      ctx.fillStyle = '#e9e4da';
      ctx.fillRect(0, 0, w, h);
    },
  },
  obslog: {
    ink: '#3a2f20', sub: '#6b5d49', faint: 'rgba(60,46,30,.55)',
    accent: '#a33d2a', hero: '#a33d2a', gold: '#8c6b2f',
    line: 'rgba(60,46,30,.30)', barBg: 'rgba(60,46,30,.08)', glyph: '#a33d2a', glyphDot: '#2a2118', light: true,
    base: (ctx, w, h) => {
      ctx.fillStyle = '#efe5cf';
      ctx.fillRect(0, 0, w, h);
    },
  },
  patch: {
    ink: '#f5ead0', sub: '#d6c4a0', faint: 'rgba(245,234,208,.5)',
    accent: '#ff8c42', hero: '#ffd23f', gold: '#ffd23f',
    line: 'rgba(245,234,208,.25)', barBg: 'rgba(245,234,208,.12)', glyph: '#ff8c42', glyphDot: '#ffd23f',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#1c2c52'], [1, '#0a1228']]),
  },
  moonlight: {
    ink: '#e8f0ff', sub: '#b9c6e0', faint: 'rgba(190,212,255,.5)',
    accent: '#bcd4ff', hero: '#dfe9ff', gold: '#e8e3c8',
    line: 'rgba(190,212,255,.22)', barBg: 'rgba(190,212,255,.11)', glyph: '#bcd4ff', glyphDot: '#e8e3c8',
    base: (ctx, w, h) => linGrad(ctx, w, h, [[0, '#101c33'], [1, '#06101f']]),
  },
};

/** Each theme's background motif (drawn on top of its base in the palette colours). */
export const THEME_MOTIF: Record<ShareThemeId, ShareBackgroundId> = {
  dark: 'observatory',
  star: 'starfield',
  astro: 'nebula',
  galaxy: 'galaxy',
  blackhole: 'blackhole',
  aurora: 'aurora',
  blueprint: 'blueprint',
  atlas: 'atlas',
  eclipse: 'eclipse',
  milkyway: 'milkyway',
  comet: 'comet',
  deepfield: 'deepfield',
  filmneg: 'filmneg',
  obslog: 'obslog',
  patch: 'patch',
  moonlight: 'moonlight',
};

// ---- backgrounds (decoupled motif layer, drawn in the palette colours) ------

/** Two glowing guide-star markers (red + teal), echoing the design references. */
function starMarkers(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const r = Math.min(w, h) * 0.011;
  const marks = [
    { x: w * 0.3, y: h * 0.55, c: MARK_RED },
    { x: w * 0.345, y: h * 0.625, c: MARK_TEAL },
  ];
  ctx.save();
  for (const m of marks) {
    const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 6);
    glow.addColorStop(0, hexA(m.c, 0.5));
    glow.addColorStop(1, hexA(m.c, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 6, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = hexA(m.c, 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 1.9, 0, 6.283);
    ctx.stroke();
    ctx.fillStyle = m.c;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 0.72, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** Wireframe globe/dome — concentric rings + meridians, for Observatory. */
function globe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, 6.283);
  ctx.stroke();
  for (const k of [0.34, 0.68]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * k, r, 0, 0, 6.283);
    ctx.stroke();
  }
  for (const k of [0.4, 0.74]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * k, 0, 0, 6.283);
    ctx.stroke();
  }
  ctx.restore();
}

/** Deterministic mulberry32 RNG so the new motifs render identically each paint. */
function bgRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A bright spiral galaxy pinwheel (prominent, not a smudge) + golden core. */
function galaxyBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  radialWash(ctx, w * 0.62, h * 0.42, Math.max(w, h) * 0.7, hexA(t.hero, 0.26));
  starfield(ctx, w, h, 150, 0.85);
  const cx = w * 0.62;
  const cy = h * 0.42;
  const R = Math.min(w, h) * 0.62;
  const rnd = bgRand(11);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  ctx.scale(1, 0.6);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.9);
  g.addColorStop(0, 'rgba(255,243,219,0.30)');
  g.addColorStop(0.4, hexA(t.hero, 0.12));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, 0, 6.283);
  ctx.fill();
  const arms = 3;
  const per = 240;
  for (let a = 0; a < arms; a++) {
    const a0 = a * (6.283 / arms);
    for (let i = 0; i < per; i++) {
      const tt = i / per;
      const ang = a0 + tt * 4 + (rnd() - 0.5) * 0.24;
      const rad = R * (0.1 + 0.88 * tt);
      const br = rnd();
      ctx.globalAlpha = (1 - tt) * 0.5 + 0.1;
      ctx.fillStyle = br > 0.82 ? t.hero : br > 0.6 ? t.gold : '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, rnd() * 1.8 + 0.4, 0, 6.283);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.22);
  g.addColorStop(0, 'rgba(255,248,228,0.95)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.22, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

/** A glowing accretion disk warping around a black core. */
function blackHoleBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  starfield(ctx, w, h, 150, 0.8);
  const cx = w * 0.5;
  const cy = h * 0.42;
  const R = Math.min(w, h) * 0.3;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.32);
  for (let i = 0; i < 3; i++) {
    const rr = R * (1.1 + i * 0.2);
    const g = ctx.createRadialGradient(0, 0, rr * 0.6, 0, 0, rr);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.8, hexA(t.gold, 0.5 - i * 0.12));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
  const ring = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
  ring.addColorStop(0, 'rgba(0,0,0,0)');
  ring.addColorStop(0.7, hexA(t.accent, 0.4));
  ring.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#05050a';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.5, 0, 6.283);
  ctx.fill();
}

/** Vector aurora curtains — fanned vertical gradient bands. */
function auroraBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const rnd = bgRand(33);
  const cols = [t.hero, '#9b6cff', t.accent, t.gold];
  for (let i = 0; i < 13; i++) {
    const x = (i / 12) * w + (rnd() - 0.5) * 40;
    const top = h * (0.04 + rnd() * 0.1);
    const bot = h * (0.5 + rnd() * 0.36);
    const wd = 18 + rnd() * 42;
    const col = cols[i % cols.length];
    const g = ctx.createLinearGradient(x, top, x, bot);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, hexA(col, 0.22));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - wd, top);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 60, (top + bot) / 2, x - wd * 0.4, bot);
    ctx.lineTo(x + wd * 0.4, bot);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 60, (top + bot) / 2, x + wd, top);
    ctx.closePath();
    ctx.fill();
  }
  starfield(ctx, w, h, 200, 0.9);
}

/** The Milky Way galactic core band crossing the frame. */
function milkyWayBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  starfield(ctx, w, h, 160, 0.8);
  const rnd = bgRand(19);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.2);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, hexA(t.gold, 0.22));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w, -h * 0.2, 2 * w, h * 0.4);
  for (let i = 0; i < 700; i++) {
    const x = (rnd() - 0.5) * 2 * w;
    const y = (rnd() + rnd() - 1) * h * 0.16;
    const br = rnd();
    ctx.globalAlpha = 0.2 + br * 0.6;
    ctx.fillStyle = br > 0.8 ? t.gold : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, rnd() * 1.2 + 0.3, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8,6,16,0.5)';
  ctx.fillRect(-w, -2, 2 * w, 4);
  ctx.restore();
}

/** An optical-schematic blueprint: coordinate grid + a telescope reticle. */
function blueprintBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  coordGrid(ctx, w, h, t.accent, 0.14);
  const cx = w * 0.78;
  const cy = h * 0.2;
  const R = Math.min(w, h) * 0.16;
  ctx.strokeStyle = hexA(t.accent, 0.5);
  ctx.lineWidth = 1;
  for (const k of [0.4, 0.7, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * k, 0, 6.283);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R);
  ctx.lineTo(cx, cy + R);
  ctx.stroke();
  starfield(ctx, w, h, 90, 0.5);
}

/** A charted star atlas: gold coordinate grid + constellations + markers. */
function atlasBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  coordGrid(ctx, w, h, t.gold, 0.1);
  constellations(ctx, w, h, 4242, hexA(t.gold, 0.55), hexA(t.accent, 0.95), 5);
  starfield(ctx, w, h, 120, 0.7);
  starMarkers(ctx, w, h);
}

/** A total eclipse: black disk with a bright corona ring. */
function eclipseBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  starfield(ctx, w, h, 110, 0.6);
  const cx = w * 0.5;
  const cy = h * 0.4;
  const R = Math.min(w, h) * 0.18;
  const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.2);
  g.addColorStop(0, hexA(t.accent, 0.55));
  g.addColorStop(0.5, hexA(t.hero, 0.2));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 2.2, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#05050a';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 6.283);
  ctx.stroke();
}

/** A comet streaking across with a glowing head and a fanned tail. */
function cometBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  starfield(ctx, w, h, 160, 0.85);
  const hx = w * 0.72;
  const hy = h * 0.3;
  const tail = ctx.createLinearGradient(hx, hy, w * 0.1, h * 0.85);
  tail.addColorStop(0, hexA(t.accent, 0.5));
  tail.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 12);
  ctx.lineTo(w * 0.1, h * 0.85);
  ctx.lineTo(hx, hy + 12);
  ctx.closePath();
  ctx.fill();
  const head = ctx.createRadialGradient(hx, hy, 0, hx, hy, 30);
  head.addColorStop(0, '#ffffff');
  head.addColorStop(0.4, hexA(t.accent, 0.8));
  head.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(hx, hy, 30, 0, 6.283);
  ctx.fill();
}

/** A Hubble-style deep field: scattered far galaxies on near-black. */
function deepFieldBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const rnd = bgRand(27);
  const cols = [t.hero, t.accent, t.gold, '#9b6cff', '#ffffff'];
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = rnd() * 6 + 1.5;
    const col = cols[(rnd() * cols.length) | 0];
    ctx.globalAlpha = 0.2 + rnd() * 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  starfield(ctx, w, h, 40, 0.5);
}

/** A mission-patch motif: concentric arcs + an orbit ellipse. */
function patchBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const cx = w * 0.5;
  const cy = h * 0.4;
  const R = Math.min(w, h) * 0.36;
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = hexA(i % 2 ? t.accent : t.hero, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.5 + i * 0.25), 0, 6.283);
    ctx.stroke();
  }
  ctx.strokeStyle = hexA(t.gold, 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.95, R * 0.4, -0.5, 0, 6.283);
  ctx.stroke();
  ctx.restore();
  starfield(ctx, w, h, 120, 0.7);
  starMarkers(ctx, w, h);
}

/** A luminous waxing moon with soft craters + a moonlit wash. */
function moonlightBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  radialWash(ctx, w * 0.7, h * 0.24, Math.max(w, h) * 0.7, hexA(t.accent, 0.2));
  starfield(ctx, w, h, 120, 0.7);
  const cx = w * 0.72;
  const cy = h * 0.24;
  const R = Math.min(w, h) * 0.16;
  const rnd = bgRand(47);
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, hexA('#9db8e8', 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,130,170,0.35)';
  for (let i = 0; i < 8; i++) {
    const a = rnd() * 6.283;
    const rr = rnd() * R * 0.7;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rnd() * R * 0.12 + 2, 0, 6.283);
    ctx.fill();
  }
}

/** A dark film-strip frame: sprocket holes top + bottom, faint grain. */
function filmNegBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const strip = Math.max(40, h * 0.06);
  ctx.fillStyle = 'rgba(8,8,12,0.85)';
  ctx.fillRect(0, 0, w, strip);
  ctx.fillRect(0, h - strip, w, strip);
  ctx.fillStyle = hexA(t.gold, 0.7);
  const holeW = strip * 0.42;
  const holeH = strip * 0.34;
  const gap = holeW * 2.1;
  for (let x = gap * 0.4; x < w; x += gap) {
    roundRect(ctx, x, (strip - holeH) / 2, holeW, holeH, 4);
    ctx.fill();
    roundRect(ctx, x, h - strip + (strip - holeH) / 2, holeW, holeH, 4);
    ctx.fill();
  }
  ctx.strokeStyle = hexA(t.accent, 0.25);
  ctx.lineWidth = 2;
  ctx.strokeRect(strip * 0.4, strip + 8, w - strip * 0.8, h - 2 * strip - 16);
  starfield(ctx, w, h, 70, 0.4);
}

/** A dark ruled logbook: horizontal rules + a margin line. */
function obsLogBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const rnd = bgRand(61);
  ctx.strokeStyle = hexA(t.line ? t.accent : t.accent, 0.12);
  ctx.lineWidth = 1;
  const step = Math.max(34, h / 26);
  for (let y = step * 2; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = hexA(t.hero, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, 0);
  ctx.lineTo(w * 0.12, h);
  ctx.stroke();
  ctx.fillStyle = hexA(t.gold, 0.5);
  for (let i = 0; i < 12; i++) {
    const y = step * (2 + Math.floor(rnd() * 22));
    ctx.beginPath();
    ctx.arc(w * 0.12, y, 2.5, 0, 6.283);
    ctx.fill();
  }
  starfield(ctx, w, h, 50, 0.35);
}

/** Background motif painters, keyed by id. Each draws in the palette's colours. */
const BACKGROUNDS: Record<ShareBackgroundId, (ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette) => void> = {
  observatory: (ctx, w, h, t) => {
    coordGrid(ctx, w, h, t.accent, 0.09);
    globe(ctx, w * 0.82, h * 0.16, Math.min(w, h) * 0.13, t.accent, 0.22);
    reticle(ctx, w * 0.82, h * 0.16, Math.min(w, h) * 0.07, t.accent, 0.24);
    constellations(ctx, w, h, 5151, hexA(t.hero, 0.5), hexA(t.accent, 0.95), 4);
    starfield(ctx, w, h, 120, 0.7);
    starMarkers(ctx, w, h);
  },
  starfield: (ctx, w, h, t) => {
    starfield(ctx, w, h, 260, 0.98);
    constellations(ctx, w, h, 909090, hexA(t.gold, 0.5), hexA(t.accent, 0.95), 5);
    starMarkers(ctx, w, h);
  },
  nebula: (ctx, w, h, t) => {
    radialWash(ctx, w * 0.22, h * 0.16, Math.max(w, h) * 0.72, hexA(t.hero, 0.42));
    radialWash(ctx, w * 0.88, h * 0.34, Math.max(w, h) * 0.64, hexA(t.accent, 0.34));
    radialWash(ctx, w * 0.54, h * 0.96, Math.max(w, h) * 0.72, hexA(t.gold, 0.3));
    starfield(ctx, w, h, 140, 0.9);
  },
  galaxy: galaxyBg,
  blackhole: blackHoleBg,
  aurora: auroraBg,
  milkyway: milkyWayBg,
  blueprint: blueprintBg,
  atlas: atlasBg,
  eclipse: eclipseBg,
  comet: cometBg,
  deepfield: deepFieldBg,
  patch: patchBg,
  moonlight: moonlightBg,
  filmneg: filmNegBg,
  obslog: obsLogBg,
};

// ---- text + content --------------------------------------------------------

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

/** Draws the "CELESTORY" wordmark (CELE ink + STORY hero) at a baseline. */
function wordmark(ctx: CanvasRenderingContext2D, t: ThemePalette, x: number, y: number, size: number): void {
  const font = `700 ${size}px Outfit, sans-serif`;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.ink;
  ctx.fillText('CELE', x, y);
  const w1 = ctx.measureText('CELE').width;
  ctx.fillStyle = t.glyph;
  ctx.fillText('STORY', x + w1, y);
}

/** Draws the filter bar-chart across [x, x+barsW] starting at top y. */
function filterBars(
  ctx: CanvasRenderingContext2D,
  t: ThemePalette,
  x: number,
  y: number,
  barsW: number,
  data: ShareCardData,
  scale: number,
): void {
  const bars = data.filters.slice(0, 7);
  if (!bars.length) {
    return;
  }
  const gap = 10 * scale;
  const bw = (barsW - gap * (bars.length - 1)) / bars.length;
  const maxH = 90 * scale;
  bars.forEach((b, i) => {
    const bx = x + i * (bw + gap);
    const bh = Math.max(6 * scale, (b.pct / 100) * maxH);
    ctx.fillStyle = t.barBg;
    ctx.fillRect(bx, y, bw, maxH);
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, y + (maxH - bh), bw, bh);
    text(ctx, b.label, bx + bw / 2, y + maxH + 26 * scale, `600 ${13 * scale}px "Fira Code", monospace`, t.sub, 'center');
  });
}

/** Portrait layout (square + story): centred stack. */
function drawPortrait(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCardData): void {
  const s = w / 1080;
  const pad = w * 0.085;
  wordmark(ctx, t, pad, pad + 34 * s, 34 * s);
  text(ctx, d.yearLabel, w - pad, pad + 46 * s, `800 ${52 * s}px Orbitron, sans-serif`, t.hero, 'right');

  const cx = w / 2;
  text(ctx, 'TOTAL INTEGRATION', cx, h * 0.3, `600 ${17 * s}px "Fira Code", monospace`, t.faint, 'center');
  text(ctx, d.heroTime, cx, h * 0.3 + 130 * s, `700 ${118 * s}px Outfit, sans-serif`, t.hero, 'center');
  text(ctx, d.name, cx, h * 0.3 + 200 * s, `500 ${26 * s}px Outfit, sans-serif`, t.sub, 'center');

  const statsY = h * (h > w ? 0.62 : 0.6);
  const n = d.stats.length;
  d.stats.forEach((st, i) => {
    const sx = pad + ((w - 2 * pad) / n) * (i + 0.5);
    text(ctx, st.v, sx, statsY, `700 ${64 * s}px Orbitron, sans-serif`, t.ink, 'center');
    text(ctx, st.k, sx, statsY + 40 * s, `600 ${15 * s}px "Fira Code", monospace`, t.faint, 'center');
  });

  filterBars(ctx, t, pad, h * (h > w ? 0.76 : 0.74), w - 2 * pad, d, s);
  text(ctx, d.url, cx, h - pad, `500 ${16 * s}px "Fira Code", monospace`, t.faint, 'center');
}

/** Landscape layout: left identity, right stats + bars. */
function drawWide(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCardData): void {
  const s = h / 675;
  const pad = h * 0.1;
  const lx = pad;
  wordmark(ctx, t, lx, pad + 30 * s, 30 * s);
  text(ctx, 'TOTAL INTEGRATION', lx, h * 0.4, `600 ${15 * s}px "Fira Code", monospace`, t.faint, 'left');
  text(ctx, d.heroTime, lx, h * 0.4 + 96 * s, `700 ${96 * s}px Outfit, sans-serif`, t.hero, 'left');
  text(ctx, d.name, lx, h * 0.4 + 150 * s, `500 ${22 * s}px Outfit, sans-serif`, t.sub, 'left');

  const rx = w * 0.58;
  text(ctx, d.yearLabel, w - pad, pad + 40 * s, `800 ${46 * s}px Orbitron, sans-serif`, t.hero, 'right');
  const n = d.stats.length;
  d.stats.forEach((st, i) => {
    const sx = rx + ((w - pad - rx) / n) * (i + 0.5);
    text(ctx, st.v, sx, h * 0.46, `700 ${52 * s}px Orbitron, sans-serif`, t.ink, 'center');
    text(ctx, st.k, sx, h * 0.46 + 32 * s, `600 ${13 * s}px "Fira Code", monospace`, t.faint, 'center');
  });
  filterBars(ctx, t, rx, h * 0.6, w - pad - rx, d, s);
  text(ctx, d.url, w - pad, h - pad, `500 ${15 * s}px "Fira Code", monospace`, t.faint, 'right');
}

/**
 * Render a share card into `canvas` for the given design + format + data.
 * Browser-only (uses Canvas 2D).
 */
export function renderShareCard(
  canvas: HTMLCanvasElement,
  themeId: ShareThemeId,
  backgroundId: ShareBackgroundId,
  formatId: ShareFormatId,
  data: ShareCardData,
): void {
  const fmt = SHARE_FORMATS[formatId];
  const theme = THEMES[themeId];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.textBaseline = 'alphabetic';
  theme.base(ctx, fmt.w, fmt.h);
  BACKGROUNDS[backgroundId](ctx, fmt.w, fmt.h, theme);
  if (fmt.w > fmt.h) {
    drawWide(ctx, theme, fmt.w, fmt.h, data);
  } else {
    drawPortrait(ctx, theme, fmt.w, fmt.h, data);
  }
}

// ---- per-object share card ----------------------------------------------

/** Build the per-object share data from a ledger object. */
export function buildObjectShareData(
  obj: LedgerObject,
  ledger: CelestoryLedger,
  displayUrl: string,
): ObjectShareData {
  const filterTotal = obj.filters.reduce((sum, f) => sum + f.seconds, 0) || 1;
  const equipment = obj.equipmentIds
    .map((id) => ledger.equipment.find((e) => e.id === id)?.displayName)
    .filter((n): n is string => !!n);
  return {
    name: obj.displayName,
    designation: obj.designation || '',
    type: obj.type || obj.category,
    category: obj.category,
    heroTime: formatDuration(obj.totalIntegrationSeconds),
    stats: [
      { v: formatCount(obj.lightFrameCount), k: 'Frames' },
      { v: formatCount(obj.nightCount), k: 'Nights' },
    ],
    rangeStr: `${(obj.firstLight || '').slice(0, 10)} → ${(obj.latestSession || '').slice(0, 10)}`,
    filters: obj.filters
      .slice(0, 7)
      .map((f) => ({ label: filterLabel(f.name), color: filterColor(f.name), pct: f.seconds / filterTotal })),
    equipment,
    url: displayUrl,
  };
}

/** Render a single-object share card to the canvas. */
export function renderObjectShareCard(
  canvas: HTMLCanvasElement,
  themeId: ShareThemeId,
  backgroundId: ShareBackgroundId,
  formatId: ShareFormatId,
  data: ObjectShareData,
): void {
  const fmt = SHARE_FORMATS[formatId];
  const theme = THEMES[themeId];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.textBaseline = 'alphabetic';
  theme.base(ctx, fmt.w, fmt.h);
  BACKGROUNDS[backgroundId](ctx, fmt.w, fmt.h, theme);
  scrim(ctx, fmt.w, fmt.h, theme);
  drawObjectCard(ctx, theme, fmt.w, fmt.h, data);
}

/** Object-card layout — works across portrait, square and landscape. */
function drawObjectCard(
  ctx: CanvasRenderingContext2D,
  t: ThemePalette,
  w: number,
  h: number,
  data: ObjectShareData,
): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  const innerW = w - pad * 2;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);

  let y = h * 0.28;
  if (data.designation) {
    setLS(ctx as Ctx2D, 4 * s);
    text(ctx, data.designation.toUpperCase(), pad, y, fnt(600, 26 * s, F_LABEL), t.accent);
    setLS(ctx as Ctx2D, 0);
    y += 26 * s;
  }
  text(ctx, data.name, pad, y + 70 * s, fnt(800, 76 * s, F_HEAD), t.ink);
  y += 70 * s;
  text(ctx, data.type, pad, y + 42 * s, fnt(500, 30 * s, F_HEAD), t.sub);
  y += 42 * s + 56 * s;

  text(ctx, data.heroTime, pad, y + 100 * s, fnt(800, 112 * s, F_NUM), t.hero);
  text(ctx, 'of light collected', pad, y + 138 * s, fnt(500, 26 * s, F_HEAD), t.sub);
  y += 138 * s + 56 * s;

  data.stats.forEach((st, i) => {
    const sx = pad + (i * innerW) / 2;
    text(ctx, st.v, sx, y + 54 * s, fnt(800, 56 * s, F_NUM), t.ink);
    text(ctx, st.k.toUpperCase(), sx, y + 84 * s, fnt(600, 22 * s, F_LABEL), t.sub);
  });
  y += 120 * s;

  if (data.filters.length) {
    const barH = 26 * s;
    let bx = pad;
    data.filters.forEach((f) => {
      const bw = Math.max(4 * s, innerW * f.pct);
      ctx.fillStyle = f.color;
      roundRect(ctx, bx, y, bw - 3 * s, barH, 6 * s);
      ctx.fill();
      bx += bw;
    });
    y += barH + 30 * s;
    let lx = pad;
    text(ctx, data.filters.map((f) => f.label).join('  ·  '), lx, y, fnt(600, 22 * s, F_LABEL), t.sub);
    void lx;
  }

  if (data.equipment.length) {
    text(ctx, data.equipment.join('  ·  '), pad, h - pad - 38 * s, fnt(500, 24 * s, F_HEAD), t.sub);
  }
  text(ctx, data.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

// ---- per-equipment share card -------------------------------------------

/** Build the per-equipment share data from a ledger equipment item. */
export function buildEquipmentShareData(
  equip: LedgerEquipment,
  ledger: CelestoryLedger,
  displayUrl: string,
): EquipmentShareData {
  const specs: string[] = [];
  if (equip.focalLengthMm) {
    specs.push(`${equip.focalLengthMm}mm`);
  }
  if (equip.fRatio) {
    specs.push(`f/${equip.fRatio}`);
  }
  const objects = equip.objectIds
    .map((id) => ledger.objects.find((o) => o.id === id))
    .filter((o): o is LedgerObject => !!o)
    .sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds)
    .map((o) => o.designation || o.displayName);
  return {
    kind: equip.kind,
    name: equip.displayName,
    detail: specs.join(' · '),
    heroTime: formatDuration(equip.totalIntegrationSeconds),
    stats: [
      { v: formatCount(equip.lightFrameCount), k: 'Frames' },
      { v: formatCount(equip.objectCount), k: 'Targets' },
    ],
    rangeStr: `${(equip.firstLight || '').slice(0, 10)} → ${(equip.latestSession || '').slice(0, 10)}`,
    objects,
    url: displayUrl,
  };
}

/** Render a single-equipment share card to the canvas (story / square only). */
export function renderEquipmentShareCard(
  canvas: HTMLCanvasElement,
  themeId: ShareThemeId,
  backgroundId: ShareBackgroundId,
  formatId: ShareFormatId,
  data: EquipmentShareData,
): void {
  const fmt = SHARE_FORMATS[formatId];
  const theme = THEMES[themeId];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.textBaseline = 'alphabetic';
  theme.base(ctx, fmt.w, fmt.h);
  BACKGROUNDS[backgroundId](ctx, fmt.w, fmt.h, theme);
  scrim(ctx, fmt.w, fmt.h, theme);
  drawEquipmentCard(ctx, theme, fmt.w, fmt.h, data);
}

/** Equipment-card layout — kind + name, hero integration, stats, captured targets. */
function drawEquipmentCard(
  ctx: CanvasRenderingContext2D,
  t: ThemePalette,
  w: number,
  h: number,
  data: EquipmentShareData,
): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  const innerW = w - pad * 2;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);

  let y = h * 0.28;
  setLS(ctx as Ctx2D, 4 * s);
  text(ctx, data.kind.toUpperCase(), pad, y, fnt(600, 26 * s, F_LABEL), t.accent);
  setLS(ctx as Ctx2D, 0);
  y += 26 * s;
  text(ctx, data.name, pad, y + 70 * s, fnt(800, 70 * s, F_HEAD), t.ink);
  y += 70 * s;
  if (data.detail) {
    text(ctx, data.detail, pad, y + 42 * s, fnt(500, 30 * s, F_HEAD), t.sub);
    y += 42 * s;
  }
  y += 56 * s;

  text(ctx, data.heroTime, pad, y + 100 * s, fnt(800, 112 * s, F_NUM), t.hero);
  text(ctx, 'of light gathered', pad, y + 138 * s, fnt(500, 26 * s, F_HEAD), t.sub);
  y += 138 * s + 56 * s;

  data.stats.forEach((st, i) => {
    const sx = pad + (i * innerW) / 2;
    text(ctx, st.v, sx, y + 54 * s, fnt(800, 56 * s, F_NUM), t.ink);
    text(ctx, st.k.toUpperCase(), sx, y + 84 * s, fnt(600, 22 * s, F_LABEL), t.sub);
  });
  y += 130 * s;

  if (data.objects.length) {
    text(ctx, 'CAPTURED', pad, y, fnt(600, 22 * s, F_LABEL), t.faint);
    y += 34 * s;
    text(ctx, data.objects.slice(0, 6).join('   ·   '), pad, y, fnt(600, 26 * s, F_HEAD), t.sub);
  }

  text(ctx, data.rangeStr, pad, h - pad - 38 * s, fnt(500, 22 * s, F_LABEL), t.faint);
  text(ctx, data.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

// ---- single-card story types (beyond the summary) -----------------------

/** Render a non-summary single-card story type (year / targets / rig). */
export function renderStoryCard(
  canvas: HTMLCanvasElement,
  themeId: ShareThemeId,
  backgroundId: ShareBackgroundId,
  formatId: ShareFormatId,
  storyType: string,
  data: ShareCarouselData,
): void {
  const fmt = SHARE_FORMATS[formatId];
  const theme = THEMES[themeId];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.textBaseline = 'alphabetic';
  theme.base(ctx, fmt.w, fmt.h);
  BACKGROUNDS[backgroundId](ctx, fmt.w, fmt.h, theme);
  scrim(ctx, fmt.w, fmt.h, theme);
  (STORY_RENDERERS[storyType] ?? drawObservatoryProfile)(ctx, theme, fmt.w, fmt.h, data);
}

/** A single-card story renderer (paints over the prepared background). */
type StoryRenderer = (
  ctx: CanvasRenderingContext2D,
  t: ThemePalette,
  w: number,
  h: number,
  d: ShareCarouselData,
) => void;

/**
 * Drop-in story registry: each non-summary story id maps to its renderer.
 * Add a future design = one function + one line here (and a STORY_TYPES entry).
 */
const STORY_RENDERERS: Record<string, StoryRenderer> = {
  'year-in-review': drawYearInReview,
  'target-collection': drawTargetCollection,
  'observatory-profile': drawObservatoryProfile,
  timeline: drawTimelineStory,
  'gear-loadout': drawGearLoadout,
  'filter-spectrum': drawFilterSpectrum,
  'sky-dome': drawSkyDome,
  'moon-ribbon': drawMoonRibbon,
};

/** Year-in-review: the year set in giant type with the headline stats. */
function drawYearInReview(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.32, fnt(600, 40 * s, F_HEAD), t.sub);
  text(ctx, 'YEAR IN REVIEW', pad, h * 0.32 + 38 * s, fnt(700, 30 * s, F_LABEL), t.accent);
  text(ctx, d.yearLabel, pad, h * 0.56, fnt(800, 260 * s, F_NUM), t.hero);
  const stats = [
    { v: d.heroTime, k: 'Of light' },
    { v: d.objectCountStr, k: 'Targets' },
    { v: d.nightsBigStr, k: 'Nights' },
  ];
  const innerW = w - pad * 2;
  stats.forEach((st, i) => {
    const sx = pad + (i * innerW) / 3;
    text(ctx, st.v, sx, h * 0.72, fnt(800, 56 * s, F_NUM), t.ink);
    text(ctx, st.k.toUpperCase(), sx, h * 0.72 + 30 * s, fnt(600, 22 * s, F_LABEL), t.sub);
  });
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/** Top-targets: the most-imaged objects, ranked. */
function drawTargetCollection(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.2, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'TOP TARGETS', pad, h * 0.2 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);
  const rows = d.topTargets.slice(0, 6);
  let y = h * 0.34;
  const rowH = (h * 0.56) / Math.max(1, rows.length);
  rows.forEach((r, i) => {
    text(ctx, String(i + 1), pad, y + 40 * s, fnt(800, 40 * s, F_NUM), t.accent);
    text(ctx, r.label, pad + 60 * s, y + 38 * s, fnt(700, 44 * s, F_HEAD), t.ink);
    text(ctx, r.valStr, w - pad, y + 38 * s, fnt(700, 40 * s, F_NUM), t.hero, 'right');
    if (r.sub) {
      text(ctx, r.sub, pad + 60 * s, y + 66 * s, fnt(500, 22 * s, F_LABEL), t.sub);
    }
    y += rowH;
  });
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/** Observatory profile: the rig + site at a glance. */
function drawObservatoryProfile(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.2, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'THE RIG', pad, h * 0.2 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);
  const rows = d.equipment.slice(0, 6);
  let y = h * 0.34;
  const rowH = (h * 0.54) / Math.max(1, rows.length);
  rows.forEach((r) => {
    text(ctx, r.label, pad, y + 38 * s, fnt(700, 42 * s, F_HEAD), t.ink);
    if (r.sub) {
      text(ctx, r.sub, pad, y + 66 * s, fnt(500, 22 * s, F_LABEL), t.accent);
    }
    text(ctx, r.valStr, w - pad, y + 38 * s, fnt(700, 38 * s, F_NUM), t.hero, 'right');
    y += rowH;
  });
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/** Standalone Timeline: nightly activity charted across the years. */
function drawTimelineStory(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.18, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'TIMELINE', pad, h * 0.18 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);
  text(ctx, d.heroTime, pad, h * 0.18 + 156 * s, fnt(800, 76 * s, F_NUM), t.hero);
  text(ctx, `of light · ${d.rangeStr}`, pad, h * 0.18 + 198 * s, fnt(500, 24 * s, F_LABEL), t.sub);
  drawTimeline(ctx, pad, h * 0.52, w - 2 * pad, h * 0.3, d, t, s);
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/** Gear Loadout: every instrument in the kit, ranked by use. */
function drawGearLoadout(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.18, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'GEAR LOADOUT', pad, h * 0.18 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);
  text(ctx, d.equipmentCountStr, pad, h * 0.18 + 150 * s, fnt(800, 64 * s, F_NUM), t.hero);
  text(ctx, d.subEquip || 'instruments', pad, h * 0.18 + 184 * s, fnt(500, 24 * s, F_LABEL), t.sub);
  cardList(ctx, d.equipment.slice(0, 6), pad, w - 2 * pad, h * 0.36, h * 0.88, t, s);
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/**
 * Approximate wavelength (nm) for known filters; positions the spectrum
 * markers. Unknown filters fall back to even spacing across the band.
 */
const FILTER_NM: Record<string, number> = {
  ha: 656, halpha: 656, h: 656, sii: 672, s2: 672, oiii: 500, o3: 500, hb: 486, hbeta: 486,
  red: 620, r: 620, green: 530, g: 530, blue: 470, b: 470, lum: 550, l: 550, clear: 550, uvir: 550,
};

/** Filter Spectrum: hours split across an emission-spectrum band. */
function drawFilterSpectrum(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.18, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'FILTER SPECTRUM', pad, h * 0.18 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);

  // Visible-spectrum band (blue→red). Raw hex is allowed inside canvas paint code.
  const bandY = h * 0.34;
  const bandH = 30 * s;
  const bx = pad;
  const bw = w - 2 * pad;
  const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  grad.addColorStop(0, '#4d6cff');
  grad.addColorStop(0.32, '#36e0c8');
  grad.addColorStop(0.55, '#8fe25a');
  grad.addColorStop(0.74, '#ffd14a');
  grad.addColorStop(1, '#ff4d5e');
  roundRect(ctx, bx, bandY, bw, bandH, bandH / 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const lo = 430;
  const hi = 680;
  const order = d.filters.filter((f) => f.seconds > 0);
  order.forEach((f, i) => {
    const key = (f.name || f.label).toLowerCase().replace(/[^a-z0-9]/g, '');
    const nm = FILTER_NM[key] ?? lo + ((i + 0.5) / order.length) * (hi - lo);
    const mx = bx + ((Math.min(hi, Math.max(lo, nm)) - lo) / (hi - lo)) * bw;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(mx, bandY - 12 * s);
    ctx.lineTo(mx, bandY + bandH + 12 * s);
    ctx.stroke();
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(mx, bandY - 12 * s, 5 * s, 0, 6.283);
    ctx.fill();
    text(ctx, f.label, mx, bandY - 24 * s, fnt(700, 20 * s, F_LABEL), t.ink, 'center');
  });

  drawFilterChart(ctx, pad, h * 0.46, w - 2 * pad, h * 0.4, d, t, s);
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

/**
 * Sky Dome: the user's imaged targets plotted on an equatorial all-sky chart
 * (J2000). NCP at the centre, declination decreasing to the rim, RA as the
 * angle (0h at top, increasing counter-clockwise). Falls back to seeded
 * positions only when no target carries coordinates.
 */
function drawSkyDome(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.16, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'SKY DOME', pad, h * 0.16 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);

  const cx = w / 2;
  const cy = h * 0.56;
  const R = Math.min(w * 0.5 - pad, h * 0.3);
  // Equatorial azimuthal projection: dec +90 (NCP) at centre, dec −90 at rim.
  const rOf = (dec: number): number => (R * (90 - dec)) / 180;
  const angleOf = (ra: number): number => ((-90 - ra) * Math.PI) / 180;

  ctx.lineWidth = 1.5 * s;
  for (const dec of [60, 30, 0, -30]) {
    ctx.strokeStyle = hexA(t.faint, dec === 0 ? 0.5 : 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, rOf(dec), 0, 6.283);
    ctx.stroke();
  }
  ctx.strokeStyle = hexA(t.faint, 0.16);
  for (let hh = 0; hh < 24; hh += 6) {
    const a = angleOf(hh * 15);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
    text(ctx, `${hh}h`, cx + Math.cos(a) * (R + 22 * s), cy + Math.sin(a) * (R + 22 * s) + 7 * s, fnt(700, 20 * s, F_LABEL), t.faint, 'center');
  }

  const catColor = (c: string): string => {
    const k = c.toLowerCase();
    if (k.includes('galax')) {
      return t.hero;
    }
    if (k.includes('nebula')) {
      return t.accent;
    }
    if (k.includes('cluster')) {
      return t.gold;
    }
    return t.ink;
  };

  if (d.domeTargets.length) {
    const maxH = d.domeTargets.reduce((m, x) => Math.max(m, x.hours), 1);
    for (const tg of d.domeTargets) {
      const rr = Math.min(R, rOf(tg.dec));
      const a = angleOf(tg.ra);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      const mr = (5 + 9 * Math.sqrt(tg.hours / maxH)) * s;
      const col = catColor(tg.category);
      const g = ctx.createRadialGradient(px, py, 0, px, py, mr * 2.4);
      g.addColorStop(0, hexA(col, 0.85));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, mr * 2.4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, mr * 0.5, 0, 6.283);
      ctx.fill();
      text(ctx, tg.label, px + mr + 5 * s, py + 6 * s, fnt(700, 17 * s, F_LABEL), t.ink, 'left');
    }
  } else {
    d.topTargets.slice(0, 7).forEach((tg, i) => {
      const rnd = mkRand(i * 131 + 7);
      const a = rnd() * 2 * Math.PI;
      const rad = R * (0.16 + 0.66 * rnd());
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      ctx.fillStyle = t.ink;
      ctx.beginPath();
      ctx.arc(px, py, 4.5 * s, 0, 6.283);
      ctx.fill();
      text(ctx, tg.label, px + 12 * s, py + 6 * s, fnt(700, 19 * s, F_LABEL), t.ink, 'left');
    });
  }
  text(ctx, `${d.objectCountStr} targets`, pad, h - pad, fnt(700, 24 * s, F_NUM), t.hero, 'left');
  text(ctx, d.url, w - pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint, 'right');
}

/** Draws one moon phase (p: 0 new → 1 full) at (cx,cy), radius r. */
function moonDisk(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: number, lit: string, dark: string): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.fillStyle = dark;
  ctx.fill();
  if (p <= 0.02) {
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.strokeStyle = lit;
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, 6.283);
    ctx.stroke();
    return;
  }
  if (p >= 0.98) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.283);
    ctx.fillStyle = lit;
    ctx.fill();
    return;
  }
  const rx = Math.abs(r * Math.cos(Math.PI * p));
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(cx, cy, rx, r, 0, Math.PI / 2, -Math.PI / 2, p < 0.5);
  ctx.closePath();
  ctx.fillStyle = lit;
  ctx.fill();
}

/**
 * Moon Ribbon: the user's imaging nights distributed across the lunar
 * illumination cycle (new→full). Each disk is a fixed illumination level; the
 * bar beneath it counts the nights imaged at that illumination — so the ribbon
 * shows where in the cycle the user shoots (astrophotographers favour new moon).
 */
function drawMoonRibbon(ctx: CanvasRenderingContext2D, t: ThemePalette, w: number, h: number, d: ShareCarouselData): void {
  const s = Math.min(w, h) / 1080;
  const pad = 64 * s;
  wordmark(ctx, t, pad, pad + 30 * s, 30 * s);
  text(ctx, `${d.name}'s`, pad, h * 0.16, fnt(600, 36 * s, F_HEAD), t.sub);
  text(ctx, 'MOON PHASES', pad, h * 0.16 + 64 * s, fnt(800, 64 * s, F_HEAD), t.ink);

  const buckets = 13;
  const counts = new Array<number>(buckets).fill(0);
  let total = 0;
  let dark = 0;
  for (const a of d.activity) {
    const { illum } = moonIllumination(a.date);
    const idx = Math.min(buckets - 1, Math.max(0, Math.round(illum * (buckets - 1))));
    counts[idx]++;
    total++;
    if (illum < 0.5) {
      dark++;
    }
  }
  const pctDark = total ? Math.round((100 * dark) / total) : 0;
  text(ctx, `${pctDark}% of nights under a dark (< half-lit) moon`, pad, h * 0.16 + 110 * s, fnt(500, 26 * s, F_LABEL), t.sub);

  const maxC = counts.reduce((m, c) => Math.max(m, c), 1);
  const x0 = pad + 46 * s;
  const x1 = w - pad - 46 * s;
  const ry = h * 0.46;
  const r = Math.min(40 * s, (x1 - x0) / (buckets * 1.7));
  const baseTop = ry + r + 26 * s;
  const maxBarH = h * 0.16;
  const countRow = baseTop + maxBarH + 26 * s;

  for (let i = 0; i < buckets; i++) {
    const ill = i / (buckets - 1);
    const p = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * ill))) / Math.PI;
    const cxp = x0 + (x1 - x0) * (i / (buckets - 1));
    const lit = hexLerp(BRAND_CYAN, BRAND_PINK, ill);
    moonDisk(ctx, cxp, ry, r, p, lit, hexA(lit, 0.16));
    if (counts[i] > 0) {
      const bh = (counts[i] / maxC) * maxBarH;
      ctx.fillStyle = lit;
      roundRect(ctx, cxp - r * 0.55, baseTop, r * 1.1, bh, Math.min(r * 0.5, 6 * s));
      ctx.fill();
      text(ctx, String(counts[i]), cxp, countRow, fnt(700, 20 * s, F_NUM), t.ink, 'center');
    }
  }
  text(ctx, 'NEW', x0, countRow + 34 * s, fnt(700, 20 * s, F_LABEL), t.faint, 'center');
  text(ctx, 'FULL', x1, countRow + 34 * s, fnt(700, 20 * s, F_LABEL), t.faint, 'center');
  text(ctx, d.url, pad, h - pad, fnt(500, 22 * s, F_LABEL), t.faint);
}

// ---- carousel: a 6-slide astronomy story --------------------------------

/** Number of slides in the share carousel. */
export const CAROUSEL_SLIDE_COUNT = 6;

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function fnt(weight: number | string, px: number, family: string): string {
  return `${weight} ${Math.round(px)}px ${family}`;
}
function setLS(ctx: Ctx2D, px: number): void {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    // not supported — ignore
  }
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const F_HEAD = 'Outfit, sans-serif';
const F_NUM = 'Orbitron, sans-serif';
const F_LABEL = '"Fira Code", monospace';

// date helpers for the timeline
function ymdParts(value: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
}
function utc(value: string): number {
  const p = ymdParts(value);
  return p ? Date.UTC(p.y, p.m, p.d) : 0;
}

function scrim(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ThemePalette): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (theme.light) {
    // Light themes (film negative / observer's log) get a bright wash so dark ink stays legible.
    g.addColorStop(0, 'rgba(246,243,236,0.30)');
    g.addColorStop(0.5, 'rgba(246,243,236,0.16)');
    g.addColorStop(1, 'rgba(246,243,236,0.42)');
  } else {
    g.addColorStop(0, 'rgba(5,6,12,0.32)');
    g.addColorStop(0.5, 'rgba(5,6,12,0.46)');
    g.addColorStop(1, 'rgba(5,6,12,0.58)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ---- motifs ----
function drawBigConstellation(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const rnd = mkRand(303);
  ctx.save();
  ctx.strokeStyle = hexA(t.hero, 0.42);
  ctx.lineWidth = 1.6;
  for (let c = 0; c < 4; c++) {
    let x = w * (0.15 + rnd() * 0.7);
    let y = h * (0.12 + rnd() * 0.7);
    const n = 3 + Math.floor(rnd() * 3);
    const pts = [{ x, y }];
    for (let k = 0; k < n; k++) {
      x += (rnd() - 0.5) * w * 0.22;
      y += (rnd() - 0.5) * h * 0.18;
      pts.push({ x, y });
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,232,255,.92)';
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 3.2 : 2.4, 0, 6.283);
      ctx.fill();
    });
  }
  ctx.restore();
}
function drawOrbits(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxR: number, t: ThemePalette, seed: number): void {
  const rnd = mkRand(seed);
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.2);
  g.addColorStop(0, hexA(t.hero, 0.5));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.2, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = hexA(t.gold, 0.9);
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 6.283);
  ctx.fill();
  const cols = [t.hero, t.accent, t.gold, '#cfe2ff', t.hero];
  for (let i = 1; i <= 5; i++) {
    const r = maxR * (0.2 + i * 0.158);
    const ry = r * 0.4;
    ctx.strokeStyle = hexA(t.faint, 0.34);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, 6.283);
    ctx.stroke();
    const ang = rnd() * 6.283;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * ry, 5 + rnd() * 7, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}
function drawGalaxy(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: ThemePalette, seed: number): void {
  const rnd = mkRand(seed);
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
  g.addColorStop(0, 'rgba(255,246,225,0.55)');
  g.addColorStop(0.4, hexA(t.hero, 0.18));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 360; i++) {
      const tt = i / 360;
      const ang = a * Math.PI + tt * 4.3 + (rnd() - 0.5) * 0.28;
      const rad = tt * R + (rnd() - 0.5) * R * 0.05;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad * 0.62;
      const br = rnd();
      ctx.globalAlpha = 0.5 * (1 - tt) + 0.08;
      ctx.fillStyle = br > 0.86 ? t.hero : br > 0.6 ? '#cfe2ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, rnd() * 1.7 + 0.4, 0, 6.283);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawRingedPlanet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: ThemePalette): void {
  ctx.save();
  ctx.strokeStyle = hexA(t.gold, 0.45);
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.85, r * 0.62, -0.5, Math.PI, 2 * Math.PI);
  ctx.stroke();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, hexA(t.hero, 0.95));
  g.addColorStop(0.6, hexA(t.accent, 0.8));
  g.addColorStop(1, 'rgba(10,10,22,0.92)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = hexA(t.gold, 0.85);
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.85, r * 0.62, -0.5, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}
function drawNebulaBlobs(ctx: CanvasRenderingContext2D, w: number, h: number, t: ThemePalette): void {
  const rnd = mkRand(5);
  const palette = ['#ff4d6d', '#22d3c5', '#4d8df0', t.gold, '#9b6cff'];
  for (let i = 0; i < 5; i++) {
    const x = rnd() * w;
    const y = h * (0.16 + rnd() * 0.5);
    const r = 150 + rnd() * 240;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(palette[i % palette.length], 0.24));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
function drawAperture(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: ThemePalette): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  g.addColorStop(0, hexA(t.hero, 0.3));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = hexA(t.faint, 0.45);
  for (let i = 3; i >= 1; i--) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, ((r * 0.34) * i) / 1.05, 0, 6.283);
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
  ctx.fillStyle = hexA(t.hero, 0.85);
  ctx.fill();
  ctx.strokeStyle = hexA(t.gold, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(cx - ar * 0.28, cy - ar * 0.28, ar * 0.22, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

// ---- slide helpers ----
function slideHero(
  ctx: Ctx2D,
  w: number,
  h: number,
  sc: number,
  t: ThemePalette,
  eyebrow: string,
  num: string,
  sub: string,
): void {
  const pad = w * 0.085;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.faint;
  ctx.textBaseline = 'alphabetic';
  ctx.font = fnt(700, 23 * sc, F_LABEL);
  setLS(ctx, 3.5 * sc);
  ctx.fillText(eyebrow, pad, h * 0.135);
  setLS(ctx, 0);
  ctx.fillStyle = t.hero;
  ctx.textBaseline = 'top';
  ctx.font = fnt(700, 168 * sc, F_NUM);
  ctx.fillText(num, pad - 3 * sc, h * 0.15);
  if (sub) {
    ctx.fillStyle = t.sub;
    ctx.font = fnt(500, 27 * sc, F_LABEL);
    ctx.fillText(sub, pad, h * 0.15 + 168 * sc + 8 * sc);
  }
  ctx.textBaseline = 'alphabetic';
}
function cardList(
  ctx: CanvasRenderingContext2D,
  rows: ShareListRow[],
  x: number,
  w: number,
  y0: number,
  y1: number,
  t: ThemePalette,
  sc: number,
): void {
  const n = rows.length;
  if (!n) {
    return;
  }
  const rowH = (y1 - y0) / n;
  const maxV = rows.reduce((m, r) => Math.max(m, r.value || 0), 0) || 1;
  const barX = x + w * 0.5;
  const barW = w * 0.3;
  rows.forEach((r, i) => {
    const cy = y0 + rowH * i + rowH / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = t.ink;
    ctx.font = fnt(700, 33 * sc, F_HEAD);
    ctx.fillText(r.label, x, cy - (r.sub ? 14 * sc : 0));
    if (r.sub) {
      ctx.fillStyle = t.sub;
      ctx.font = fnt(500, 18 * sc, F_LABEL);
      ctx.fillText(r.sub, x, cy + 17 * sc);
    }
    ctx.fillStyle = hexA(t.faint, 0.26);
    roundRect(ctx, barX, cy - 6 * sc, barW, 12 * sc, 6 * sc);
    ctx.fill();
    ctx.fillStyle = t.hero;
    roundRect(ctx, barX, cy - 6 * sc, Math.max(10 * sc, barW * ((r.value || 0) / maxV)), 12 * sc, 6 * sc);
    ctx.fill();
    ctx.fillStyle = t.ink;
    ctx.font = fnt(700, 25 * sc, F_NUM);
    ctx.textAlign = 'right';
    ctx.fillText(r.valStr, x + w, cy);
    ctx.textAlign = 'left';
    if (i < n - 1) {
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y0 + rowH * (i + 1));
      ctx.lineTo(x + w, y0 + rowH * (i + 1));
      ctx.stroke();
    }
  });
  ctx.textBaseline = 'alphabetic';
}
function filterStacked(ctx: Ctx2D, x: number, y: number, w: number, hh: number, data: ShareCarouselData, t: ThemePalette, sc: number): void {
  const order = data.filters.filter((f) => f.seconds > 0);
  const sum = order.reduce((a, f) => a + f.seconds, 0) || 1;
  roundRect(ctx, x, y, w, hh, hh / 2);
  ctx.fillStyle = hexA(t.faint, 0.16);
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, hh, hh / 2);
  ctx.clip();
  let cx = x;
  order.forEach((f) => {
    const sw = (w * f.seconds) / sum;
    ctx.fillStyle = f.color;
    ctx.fillRect(cx, y, sw + 1, hh);
    cx += sw;
  });
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.font = fnt(600, 15 * sc, F_LABEL);
  const widths = order.map((f) => ctx.measureText(f.label).width + 34 * sc);
  const tw = widths.reduce((a, b) => a + b, 0);
  let lx = x + (w - tw) / 2;
  order.forEach((f, i) => {
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(lx + 7 * sc, y + hh + 32 * sc, 5 * sc, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = t.sub;
    ctx.textAlign = 'left';
    ctx.fillText(f.label, lx + 18 * sc, y + hh + 32 * sc);
    lx += widths[i];
  });
  ctx.textBaseline = 'alphabetic';
}
function drawFilterChart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, chartH: number, data: ShareCarouselData, t: ThemePalette, sc: number): void {
  const order = data.filters.filter((f) => f.seconds > 0);
  if (!order.length) {
    return;
  }
  const max = order.reduce((a, f) => Math.max(a, f.seconds), 1);
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
  order.forEach((f, i) => {
    const cx = x + slot * i + slot / 2;
    const bh = (0.12 + 0.88 * (f.seconds / max)) * usable;
    ctx.fillStyle = f.color;
    roundRect(ctx, cx - barW / 2, baseline - bh, barW, bh, 9 * sc);
    ctx.fill();
    ctx.fillStyle = t.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = fnt(700, 29 * sc, F_NUM);
    ctx.fillText(`${(f.seconds / 3600).toFixed(0)}h`, cx, baseline - bh - 16 * sc);
    ctx.fillStyle = f.color;
    ctx.textBaseline = 'top';
    ctx.font = fnt(700, 27 * sc, F_LABEL);
    ctx.fillText(f.label, cx, baseline + 17 * sc);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
function drawTimeline(ctx: Ctx2D, x: number, y: number, w: number, hgt: number, data: ShareCarouselData, t: ThemePalette, sc: number): void {
  const activity = data.activity;
  if (!activity.length) {
    return;
  }
  const max = activity.reduce((a, s) => Math.max(a, s.seconds), 1);
  const startV = utc(activity[0].date);
  const endV = utc(activity[activity.length - 1].date);
  const span = Math.max(1, Math.round((endV - startV) / 86400000));
  const baseline = y + hgt;
  const px = (v: number): number => x + Math.min(1, Math.max(0, (v - startV) / 86400000 / span)) * w;

  const y1 = ymdParts(activity[0].date)?.y ?? 0;
  const y2 = ymdParts(activity[activity.length - 1].date)?.y ?? y1;
  ctx.textBaseline = 'top';
  for (let Y = y1; Y <= y2; Y++) {
    const boundary = Y === y1 ? startV : Date.UTC(Y, 0, 1);
    const gx = px(boundary);
    if (Y > y1) {
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, y - 4 * sc);
      ctx.lineTo(gx, baseline);
      ctx.stroke();
    }
    ctx.fillStyle = t.faint;
    ctx.font = fnt(700, 17 * sc, F_LABEL);
    setLS(ctx, 1 * sc);
    ctx.textAlign = 'left';
    ctx.fillText(String(Y), Math.min(gx + (Y > y1 ? 8 * sc : 0), x + w - 46 * sc), baseline + 12 * sc);
    setLS(ctx, 0);
  }
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, baseline);
  ctx.lineTo(x + w, baseline);
  ctx.stroke();

  const byDay = new Map(activity.map((a) => [Math.round(utc(a.date) / 86400000), a.seconds]));
  const cols = Math.min(span + 1, Math.floor(w / 4));
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const di = Math.round((i / cols) * span);
    const dayIdx = Math.round(startV / 86400000) + di;
    const secs = byDay.get(dayIdx);
    if (!secs) {
      continue;
    }
    const v = secs / max;
    const bh = (0.12 + 0.88 * v) * hgt;
    ctx.fillStyle = t.hero;
    ctx.globalAlpha = 0.6 + 0.4 * v;
    roundRect(ctx, x + i * cw, baseline - bh, Math.max(2, cw - 2 * sc), bh, 2 * sc);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** Slide chrome (wordmark + slide dots + footer) on the full canvas. */
function drawCarouselChrome(ctx: Ctx2D, w: number, h: number, t: ThemePalette, index: number): void {
  const csc = Math.min(w, h) / 1080;
  const pad = 66 * csc;
  wordmark(ctx, t, pad, pad + 22 * csc, 26 * csc);
  const gap = 16 * csc;
  const dx = w - pad - (CAROUSEL_SLIDE_COUNT - 1) * gap;
  for (let i = 0; i < CAROUSEL_SLIDE_COUNT; i++) {
    ctx.beginPath();
    ctx.arc(dx + i * gap, pad + 14 * csc, (i === index ? 5 : 3.5) * csc, 0, 6.283);
    ctx.fillStyle = i === index ? t.accent : t.faint;
    ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.accent;
  ctx.font = fnt(600, 16 * csc, F_LABEL);
  ctx.fillText(' ', w - pad, h - pad * 0.62);
  ctx.textAlign = 'left';
}

// ---- slides ----
function slideHours(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawBigConstellation(ctx, w, h, t);
  ctx.textAlign = 'center';
  ctx.fillStyle = t.faint;
  ctx.textBaseline = 'alphabetic';
  ctx.font = fnt(700, 20 * sc, F_LABEL);
  setLS(ctx, 4 * sc);
  ctx.fillText(`CELESTORY   ·   ${d.yearLabel}   ·   ${d.inReview}`, w / 2, h * 0.185);
  setLS(ctx, 0);
  ctx.font = fnt(700, 21 * sc, F_LABEL);
  setLS(ctx, 3 * sc);
  ctx.fillText('TOTAL INTEGRATION', w / 2, h * 0.355);
  setLS(ctx, 0);
  ctx.fillStyle = t.hero;
  ctx.font = fnt(700, 168 * sc, F_HEAD);
  ctx.textBaseline = 'middle';
  ctx.fillText(d.heroTime, w / 2, h * 0.45);
  ctx.fillStyle = t.sub;
  ctx.font = fnt(500, 25 * sc, F_LABEL);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${d.clearNights}   ·   ${d.objectsStr} objects   ·   ${d.nightsStr} nights`, w / 2, h * 0.565);
  ctx.fillStyle = t.faint;
  ctx.font = fnt(600, 22 * sc, F_LABEL);
  ctx.fillText(d.name, w / 2, h * 0.61);
  ctx.font = fnt(700, 19 * sc, F_LABEL);
  setLS(ctx, 3 * sc);
  ctx.fillText('LIGHT COLLECTED', w / 2, h * 0.725);
  setLS(ctx, 0);
  filterStacked(ctx, pad, h * 0.755, w - 2 * pad, 20 * sc, d, t, sc);
  ctx.textAlign = 'left';
}
function slideObjects(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawOrbits(ctx, w * 0.8, h * 0.2, h * 0.18, t, 21);
  slideHero(ctx, w, h, sc, t, '02   —   OBJECTS CAPTURED', d.objectCountStr, d.subObjects);
  cardList(ctx, d.categories, pad, w - 2 * pad, h * 0.45, h * 0.88, t, sc);
}
function slideEquipment(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawAperture(ctx, w * 0.81, h * 0.2, 82 * sc, t);
  slideHero(ctx, w, h, sc, t, '03   —   EQUIPMENT', d.equipmentCountStr, d.subEquip);
  cardList(ctx, d.equipment, pad, w - 2 * pad, h * 0.45, h * 0.88, t, sc);
}
function slideNights(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawGalaxy(ctx, w * 0.8, h * 0.2, h * 0.16, t, 11);
  slideHero(ctx, w, h, sc, t, '04   —   NIGHTS UNDER SKY', d.nightsBigStr, d.rangeStr);
  drawTimeline(ctx, pad, h * 0.52, w - 2 * pad, h * 0.26, d, t, sc);
}
function slideLight(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawNebulaBlobs(ctx, w, h, t);
  ctx.textAlign = 'left';
  ctx.fillStyle = t.faint;
  ctx.font = fnt(700, 23 * sc, F_LABEL);
  setLS(ctx, 3.5 * sc);
  ctx.fillText('05   —   LIGHT, BROKEN DOWN', pad, h * 0.135);
  setLS(ctx, 0);
  ctx.fillStyle = t.ink;
  ctx.font = fnt(700, 64 * sc, F_HEAD);
  ctx.textBaseline = 'top';
  ctx.fillText('Per filter', pad, h * 0.16);
  ctx.textBaseline = 'alphabetic';
  drawFilterChart(ctx, pad, h * 0.36, w - 2 * pad, h * 0.5, d, t, sc);
}
function slideTargets(ctx: Ctx2D, w: number, h: number, sc: number, t: ThemePalette, d: ShareCarouselData): void {
  const pad = w * 0.085;
  drawRingedPlanet(ctx, w * 0.8, h * 0.2, 82 * sc, t);
  slideHero(ctx, w, h, sc, t, '06   —   TOP TARGETS', d.objectCountStr, 'your most-imaged objects');
  cardList(ctx, d.topTargets, pad, w - 2 * pad, h * 0.45, h * 0.88, t, sc);
}

const SLIDES = [slideHours, slideObjects, slideEquipment, slideNights, slideLight, slideTargets];

/** Render carousel slide `index` for the given design + format + data. */
export function renderCarouselSlide(
  canvas: HTMLCanvasElement,
  themeId: ShareThemeId,
  backgroundId: ShareBackgroundId,
  formatId: ShareFormatId,
  index: number,
  data: ShareCarouselData,
): void {
  const fmt = SHARE_FORMATS[formatId];
  const theme = THEMES[themeId];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const ctx = canvas.getContext('2d') as Ctx2D | null;
  if (!ctx) {
    return;
  }
  ctx.textBaseline = 'alphabetic';
  theme.base(ctx, fmt.w, fmt.h);
  BACKGROUNDS[backgroundId](ctx, fmt.w, fmt.h, theme);
  scrim(ctx, fmt.w, fmt.h, theme);
  const sc = Math.min(fmt.w, fmt.h) / 1080;
  const slide = SLIDES[Math.max(0, Math.min(SLIDES.length - 1, index))];
  slide(ctx, fmt.w, fmt.h, sc, theme, data);
  drawCarouselChrome(ctx, fmt.w, fmt.h, theme, index);
}

/** Ensure the canvas fonts are loaded before rendering (browser-only). */
export async function ensureShareFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }
  const faces = ['700 100px Outfit', '800 100px Orbitron', '600 20px "Fira Code"'];
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f)));
  } catch {
    // Fonts will fall back to system; rendering still succeeds.
  }
}
