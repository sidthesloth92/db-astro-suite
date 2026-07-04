/**
 * Open Graph card renderer (1200×630 PNG) for social-link unfurling. Uses
 * @vercel/og (Satori + resvg-wasm) so it runs in the Vercel/Nitro serverless
 * runtime. Built without JSX — the element tree is plain `{ type, props }`
 * objects, which is exactly what Satori consumes.
 *
 * One branded system across all five cards (landing, leaderboards, profile,
 * target, equipment): a radial-glow field + vignette, a deterministic star
 * field, the crescent brand mark + a faint decorative crescent, a hairline inner
 * frame with pink corners, then a per-card body and footer.
 */
import { ImageResponse } from '@vercel/og';
import { ORBITRON_BOLD_B64, ORBITRON_REGULAR_B64 } from './og-fonts.constants';
import { RAJDHANI_BOLD_B64, RAJDHANI_REGULAR_B64 } from './og-fonts-rajdhani.constants';
import { buildMarkGeometry } from '../../app/utils/celestory-mark.util';
import type { MarkGeometry, MarkPrimitive } from '../../app/models/celestory-mark.types';
import type {
  OgEl,
  OgEquipmentModel,
  OgHighlight,
  OgLandingModel,
  OgLeaderboardsModel,
  OgProfileModel,
  OgStat,
  OgTargetModel,
} from './og-card.model';

const WIDTH = 1200;
const HEIGHT = 630;
const VOID = '#040409';
const INK = '#e9e9f2';
const INK3 = '#85839a';
const INK4 = '#5b5970';
const LINE = 'rgba(170,160,200,0.12)';
const ACCENT = '#ff2a7b';
/** Orbitron — display: wordmark, hero numbers, target/gear names, stat values. */
const DISPLAY = 'Orbitron';
/** Rajdhani — heads/labels/sub (substitutes the design's Outfit + IBM Plex Mono). */
const HEAD = 'Rajdhani';

/** Layered radial glows + linear vignette (the card field). */
const FIELD_BG =
  'radial-gradient(760px 540px at 86% -8%, rgba(255,42,123,0.20), transparent 58%), ' +
  'radial-gradient(680px 520px at 6% 112%, rgba(25,230,221,0.08), transparent 60%), ' +
  'radial-gradient(1200px 760px at 50% 120%, rgba(255,42,123,0.05), transparent 60%), ' +
  'linear-gradient(160deg, #0a0a13 0%, #06060c 55%, #040409 100%)';

type SatoriFont = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };
let fontsCache: SatoriFont[] | null = null;

/** Decode the embedded Orbitron + Rajdhani TTFs once, as @vercel/og expects. */
function fonts(): SatoriFont[] {
  if (!fontsCache) {
    fontsCache = [
      { name: DISPLAY, data: Buffer.from(ORBITRON_REGULAR_B64, 'base64'), weight: 400, style: 'normal' },
      { name: DISPLAY, data: Buffer.from(ORBITRON_BOLD_B64, 'base64'), weight: 700, style: 'normal' },
      { name: HEAD, data: Buffer.from(RAJDHANI_REGULAR_B64, 'base64'), weight: 400, style: 'normal' },
      { name: HEAD, data: Buffer.from(RAJDHANI_BOLD_B64, 'base64'), weight: 700, style: 'normal' },
    ];
  }
  return fontsCache;
}

/** Element factory: style + optional children → the vnode shape Satori consumes. */
function el(
  type: string,
  style: Record<string, string | number>,
  children?: OgEl | OgEl[] | string,
): OgEl {
  return { type, props: children === undefined ? { style } : { style, children } };
}

/** SVG element factory: raw presentation attributes (no `style` wrapper). */
function svgEl(type: string, attrs: Record<string, unknown>, children?: OgEl[]): OgEl {
  return { type, props: children === undefined ? { ...attrs } : { ...attrs, children } };
}

// ---- brand crescent (reused from the Angular brand-mark generator) ----------

let markCache: MarkGeometry | null = null;
function mark(): MarkGeometry {
  return (markCache ??= buildMarkGeometry('icon'));
}

/** One crescent primitive → an SVG vnode (only rects appear in the icon variant). */
function shapeEl(s: MarkPrimitive): OgEl {
  const opacity = s.opacity ?? 1;
  if (s.kind === 'circle') {
    return svgEl('circle', { cx: s.cx, cy: s.cy, r: s.r, fill: s.fill ?? 'none', style: { opacity } });
  }
  if (s.kind === 'path') {
    return svgEl('path', { d: s.d, fill: s.fill ?? 'none', style: { opacity } });
  }
  return svgEl('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: s.rx, fill: s.fill ?? 'none', style: { opacity } });
}

/** The crescent brand mark at a given pixel size + overall opacity. */
function markSvg(sizePx: number, opacity: number): OgEl {
  const g = mark();
  return svgEl(
    'svg',
    { width: sizePx, height: sizePx, viewBox: g.viewBox, fill: 'none', style: { opacity } },
    g.shapes.map(shapeEl),
  );
}

// ---- shared chrome ----------------------------------------------------------

/** Full-bleed glow field + vignette. */
function field(): OgEl {
  return el('div', {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    display: 'flex',
    backgroundImage: FIELD_BG,
  });
}

/** Deterministic star scatter (right field + top strip; clear of the footer band). */
function starField(seed: number, n: number): OgEl {
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const dots: OgEl[] = [];
  let guard = 0;
  while (dots.length < n && guard++ < n * 8) {
    const x = rnd() * WIDTH;
    const y = rnd() * HEIGHT;
    if (!(x > 660 || y < 150)) continue;
    if (y > 474 && y < 602) continue;
    const sz = (rnd() < 0.82 ? 1 : 2) * (0.8 + rnd() * 1.2);
    const op = 0.1 + rnd() * 0.4;
    dots.push(
      el('div', {
        position: 'absolute',
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        width: `${sz.toFixed(1)}px`,
        height: `${sz.toFixed(1)}px`,
        borderRadius: '50%',
        background: '#ffffff',
        opacity: Number(op.toFixed(2)),
      }),
    );
  }
  return el('div', { position: 'absolute', top: '0', left: '0', width: `${WIDTH}px`, height: `${HEIGHT}px`, display: 'flex' }, dots);
}

/** The faint decorative crescent in the upper-right. */
function deco(): OgEl {
  return el('div', { position: 'absolute', top: '54px', right: '64px', width: '300px', height: '300px', display: 'flex' }, [
    markSvg(300, 0.22),
  ]);
}

/** Hairline inner frame with two pink corner accents. */
function frame(): OgEl {
  return el(
    'div',
    {
      position: 'absolute',
      top: '22px',
      left: '22px',
      width: `${WIDTH - 44}px`,
      height: `${HEIGHT - 44}px`,
      border: `1px solid ${LINE}`,
      borderRadius: '4px',
      display: 'flex',
    },
    [
      el('div', { position: 'absolute', top: '-1px', left: '-1px', width: '14px', height: '14px', borderTop: `2px solid ${ACCENT}`, borderLeft: `2px solid ${ACCENT}` }),
      el('div', { position: 'absolute', bottom: '-1px', right: '-1px', width: '14px', height: '14px', borderBottom: `2px solid ${ACCENT}`, borderRight: `2px solid ${ACCENT}` }),
    ],
  );
}

/** Brand lockup: crescent mark + "Cele"+"story" wordmark. */
function lockup(): OgEl {
  return el('div', { display: 'flex', alignItems: 'center', gap: '15px' }, [
    el('div', { display: 'flex', width: '46px', height: '46px' }, [markSvg(46, 1)]),
    el('div', { display: 'flex', fontFamily: HEAD, fontWeight: 700, fontSize: '31px', letterSpacing: '0.005em', color: INK }, [
      el('span', {}, 'Cele'),
      el('span', { color: ACCENT }, 'story'),
    ]),
  ]);
}

/** Centred body column. */
function body(children: OgEl[]): OgEl {
  return el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, children);
}

/** Footer row: stat group on the left, highlights on the right. */
function foot(children: OgEl[]): OgEl {
  return el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, children);
}

/** Assemble the full card: field → stars → deco → frame → inner(lockup, body, foot). */
function shell(bodyEl: OgEl, footEl: OgEl): OgEl {
  return el(
    'div',
    {
      position: 'relative',
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      display: 'flex',
      overflow: 'hidden',
      background: VOID,
      color: INK,
      fontFamily: HEAD,
    },
    [
      field(),
      starField(13, 50),
      deco(),
      frame(),
      el('div', { position: 'absolute', top: '0', left: '0', width: `${WIDTH}px`, height: `${HEIGHT}px`, padding: '64px 72px', display: 'flex', flexDirection: 'column' }, [
        lockup(),
        bodyEl,
        footEl,
      ]),
    ],
  );
}

// ---- body / foot pieces -----------------------------------------------------

/** Big Orbitron stat value (+ optional smaller suffix) over a Rajdhani label. */
function bigStat(s: OgStat, valueSize: number): OgEl {
  const value = el(
    'div',
    { display: 'flex', alignItems: 'baseline', fontFamily: DISPLAY, fontWeight: 700, fontSize: `${valueSize}px`, lineHeight: '1', color: INK, letterSpacing: '-0.01em' },
    s.suffix ? [el('span', {}, s.value), el('span', { fontSize: `${Math.round(valueSize * 0.62)}px` }, s.suffix)] : s.value,
  );
  const label = el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '16px', letterSpacing: '0.16em', color: INK4 }, s.label.toUpperCase());
  return el('div', { display: 'flex', flexDirection: 'column', gap: '13px' }, [value, label]);
}

/** A row of stats. */
function statRow(stats: OgStat[], valueSize = 54): OgEl {
  return el('div', { display: 'flex', gap: '64px' }, stats.map((s) => bigStat(s, valueSize)));
}

/** Right-aligned label/value highlight pairs. */
function highlights(items: OgHighlight[]): OgEl {
  return el(
    'div',
    { display: 'flex', flexDirection: 'column', gap: '13px', alignItems: 'flex-end' },
    items.map((h) =>
      el('div', { display: 'flex', alignItems: 'baseline', gap: '16px' }, [
        el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '14px', letterSpacing: '0.13em', color: INK4 }, h.label.toUpperCase()),
        el('div', { fontFamily: HEAD, fontWeight: 700, fontSize: '25px', color: INK }, h.value),
      ]),
    ),
  );
}

/** Mono-style uppercase handle/eyebrow above a hero. */
function heroHandle(text: string): OgEl {
  return el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '26px', letterSpacing: '0.18em', color: INK3, marginBottom: '8px' }, text.toUpperCase());
}

/** Giant Orbitron hero number with a smaller "h". */
function heroNum(num: string): OgEl {
  return el('div', { display: 'flex', alignItems: 'baseline', fontFamily: DISPLAY, fontWeight: 700, fontSize: '212px', lineHeight: '0.84', color: ACCENT, letterSpacing: '-0.01em' }, [
    el('span', {}, num),
    el('span', { fontSize: '131px' }, 'h'),
  ]);
}

/** Sub line under a hero. */
function heroSub(text: string): OgEl {
  return el('div', { fontFamily: HEAD, fontWeight: 700, fontSize: '31px', color: INK, marginTop: '14px' }, text);
}

/** Pink Orbitron name hero (target / equipment cards). */
function nameHero(name: string, size: number): OgEl {
  return el('div', { display: 'flex', fontFamily: DISPLAY, fontWeight: 700, fontSize: `${size}px`, lineHeight: '0.96', color: ACCENT, letterSpacing: '-0.005em', maxWidth: '940px' }, name);
}

/** Pink type/kind pill with an icon. */
function pill(icon: OgEl, label: string): OgEl {
  return el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      alignSelf: 'flex-start',
      marginTop: '26px',
      padding: '11px 20px 11px 16px',
      border: '1px solid rgba(255,42,123,0.4)',
      borderRadius: '999px',
      backgroundColor: 'rgba(255,42,123,0.09)',
    },
    [
      el('div', { display: 'flex', width: '22px', height: '22px' }, [icon]),
      el('div', { fontFamily: HEAD, fontWeight: 700, fontSize: '18px', letterSpacing: '0.2em', color: ACCENT }, label.toUpperCase()),
    ],
  );
}

/** Stroked icon-path/shape helpers (pink, round caps). */
function iPath(d: string): OgEl {
  return svgEl('path', { d, fill: 'none', stroke: ACCENT, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' });
}
function iCircle(cx: number, cy: number, r: number): OgEl {
  return svgEl('circle', { cx, cy, r, fill: 'none', stroke: ACCENT, strokeWidth: 1.8 });
}
function iRect(x: number, y: number, w: number, h: number, rx: number): OgEl {
  return svgEl('rect', { x, y, width: w, height: h, rx, fill: 'none', stroke: ACCENT, strokeWidth: 1.8 });
}
function iconSvg(children: OgEl[]): OgEl {
  return svgEl('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' }, children);
}

/** Nebula/target glyph for target cards. */
function nebulaIcon(): OgEl {
  return iconSvg([iPath('M12 3c1.6 3 1.6 5.4 0 8-1.6-2.6-1.6-5 0-8z'), iCircle(12, 14.5, 6.5), iPath('M7 12.5c1.6 1.2 8.4 1.2 10 0')]);
}
/** Camera glyph. */
function cameraIcon(): OgEl {
  return iconSvg([iRect(3, 7, 18, 13, 2.4), iPath('M8 7l1.6-2.4h4.8L16 7'), iCircle(12, 13.5, 3.6)]);
}
/** Telescope/tube glyph (also used for mounts). */
function telescopeIcon(): OgEl {
  return iconSvg([iPath('M3 14l12-5 2 4-12 5z'), iPath('M9 16l-2 5'), iPath('M13 14l3 6')]);
}
/** Pick a gear glyph by kind. */
function kindIcon(kind: string): OgEl {
  return kind.toLowerCase() === 'camera' ? cameraIcon() : telescopeIcon();
}

// ---- card builders ----------------------------------------------------------

/** Landing card — "Revealed." + community totals. */
export function landingCardPng(model: OgLandingModel): Promise<Buffer> {
  return toPng(
    shell(
      body([
        el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '23px', letterSpacing: '0.34em', color: INK3, marginBottom: '18px' }, 'YOUR ASTROPHOTOGRAPHY JOURNEY'),
        el('div', { display: 'flex', fontFamily: DISPLAY, fontWeight: 700, fontSize: '118px', lineHeight: '0.96', color: '#ffffff' }, [
          el('span', {}, 'Revealed'),
          el('span', { color: ACCENT }, '.'),
        ]),
        el('div', { fontFamily: HEAD, fontWeight: 700, fontSize: '33px', color: INK, marginTop: '22px' }, 'Every target. Every night. Every shot.'),
      ]),
      foot([
        statRow(
          [
            { value: model.hours, label: 'Tracked', suffix: 'h' },
            { value: model.astronomers, label: 'Astronomers' },
            { value: model.frames, label: 'Light frames' },
          ],
          44,
        ),
      ]),
    ),
  );
}

/** Leaderboards card — community totals + top targets. */
export function leaderboardsCardPng(model: OgLeaderboardsModel): Promise<Buffer> {
  return toPng(
    shell(
      body([heroHandle('The Community · Leaderboards'), heroNum(model.hours), heroSub('integrated by astronomers worldwide')]),
      foot([
        statRow([
          { value: model.astronomers, label: 'Astronomers' },
          { value: model.targets, label: 'Targets' },
          { value: model.frames, label: 'Light frames' },
        ]),
        highlights([
          { label: 'Top Target', value: model.topTarget },
          { label: 'Most Imaged', value: model.mostImaged },
        ]),
      ]),
    ),
  );
}

/** Per-profile card — headline stats + journey highlights. */
export function profileCardPng(model: OgProfileModel): Promise<Buffer> {
  return toPng(
    shell(
      body([heroHandle(`@${model.handle}`), heroNum(model.hours), heroSub('under the stars')]),
      foot([
        statRow([
          { value: model.targets, label: 'Targets' },
          { value: model.nights, label: 'Nights' },
          { value: model.frames, label: 'Light frames' },
        ]),
        highlights([
          { label: 'Top Target', value: model.topTarget },
          { label: 'Most Imaged', value: model.mostImaged },
          { label: 'Longest Night', value: model.longestNight },
        ]),
      ]),
    ),
  );
}

/** Per-target card — pink name + type pill + highlights. */
export function targetCardPng(model: OgTargetModel): Promise<Buffer> {
  return toPng(
    shell(
      body([heroHandle(`@${model.handle}`), nameHero(model.name, 104), pill(nebulaIcon(), model.type || 'Target')]),
      foot([
        statRow([
          { value: model.hours, label: 'Integration', suffix: 'h' },
          { value: model.nights, label: 'Nights' },
          { value: model.frames, label: 'Light frames' },
        ]),
        highlights([
          { label: 'First Light', value: model.firstLight },
          { label: 'Filters', value: model.filters },
        ]),
      ]),
    ),
  );
}

/** Per-equipment (gear) card — pink name + kind pill + highlights. */
export function equipmentCardPng(model: OgEquipmentModel): Promise<Buffer> {
  return toPng(
    shell(
      body([heroHandle(`@${model.handle}`), nameHero(model.name, 76), pill(kindIcon(model.kind), model.kind)]),
      foot([
        statRow([
          { value: model.hours, label: 'Integration', suffix: 'h' },
          { value: model.targets, label: 'Targets' },
          { value: model.frames, label: 'Light frames' },
        ]),
        highlights([
          { label: 'Most Used On', value: model.mostUsedOn },
          { label: 'In Service', value: model.inServiceYear },
        ]),
      ]),
    ),
  );
}

/** Static brand card — the universal fallback (no DB) when a link can't resolve. */
export function brandCardPng(opts: { eyebrow: string; hero: string; sub: string }): Promise<Buffer> {
  return toPng(
    shell(
      body([
        el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '23px', letterSpacing: '0.34em', color: INK3, marginBottom: '18px' }, opts.eyebrow.toUpperCase()),
        el('div', { display: 'flex', fontFamily: DISPLAY, fontWeight: 700, fontSize: '112px', lineHeight: '0.96', color: '#ffffff' }, opts.hero),
        el('div', { fontFamily: HEAD, fontWeight: 700, fontSize: '31px', color: INK, marginTop: '22px' }, opts.sub),
      ]),
      foot([el('div', { fontFamily: HEAD, fontWeight: 400, fontSize: '18px', letterSpacing: '0.12em', color: INK3 }, 'celestory.dbastrosuite.com')]),
    ),
  );
}

/** Build a PNG buffer from an element tree. */
async function toPng(element: OgEl): Promise<Buffer> {
  // Satori consumes this plain vnode shape; @vercel/og types want a ReactElement,
  // so we cast at the boundary (no JSX/React in this server module).
  const response = new ImageResponse(element as unknown as ConstructorParameters<typeof ImageResponse>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts(),
  });
  return Buffer.from(await response.arrayBuffer());
}
