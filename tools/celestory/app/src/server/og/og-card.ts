/**
 * Open Graph card renderer (1200×630 PNG) for social-link unfurling. Uses
 * @vercel/og (Satori + resvg-wasm) so it runs in the Vercel/Nitro serverless
 * runtime. Built without JSX — the element tree is plain `{ type, props }`
 * objects, which is exactly what Satori consumes.
 */
import { ImageResponse } from '@vercel/og';
import { ORBITRON_BOLD_B64, ORBITRON_REGULAR_B64 } from './og-fonts.constants';
import type { OgEl, OgProfileModel, OgStat } from './og-card.model';

const WIDTH = 1200;
const HEIGHT = 630;
const VOID = '#07070c';
const INK = '#e9e9f2';
const INK_DIM = '#85839a';
const ACCENT = '#ff2a7b';

let fontsCache: Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }> | null =
  null;

/** Decode the embedded Orbitron TTFs once, in the shape @vercel/og expects. */
function fonts(): Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }> {
  if (!fontsCache) {
    fontsCache = [
      { name: 'Orbitron', data: Buffer.from(ORBITRON_REGULAR_B64, 'base64'), weight: 400, style: 'normal' },
      { name: 'Orbitron', data: Buffer.from(ORBITRON_BOLD_B64, 'base64'), weight: 700, style: 'normal' },
    ];
  }
  return fontsCache;
}

/** Minimal element factory producing the plain vnode shape Satori consumes. */
function el(
  type: string,
  style: Record<string, string | number>,
  children?: OgEl | OgEl[] | string,
): OgEl {
  return { type, props: children === undefined ? { style } : { style, children } };
}

/** A labelled stat column for the bottom row. */
function stat(s: OgStat): OgEl {
  return el('div', { display: 'flex', flexDirection: 'column', gap: '6px' }, [
    el('div', { fontSize: '46px', fontWeight: 700, color: INK }, s.value),
    el(
      'div',
      { fontSize: '20px', fontWeight: 400, color: INK_DIM, letterSpacing: '0.18em' },
      s.label.toUpperCase(),
    ),
  ]);
}

/** The shared card shell: brand wordmark, hero block, and a stat row. */
function card(opts: {
  eyebrow: string;
  hero: string;
  heroAccent?: boolean;
  heroSize?: number;
  sub: string;
  stats: OgStat[];
}): OgEl {
  return el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: VOID,
      backgroundImage: `radial-gradient(900px 520px at 86% -10%, rgba(255,42,123,0.22), transparent 60%), radial-gradient(820px 520px at 4% 120%, rgba(25,230,221,0.10), transparent 62%)`,
      color: INK,
      fontFamily: 'Orbitron',
      padding: '72px',
    },
    [
      // brand wordmark
      el('div', { display: 'flex', alignItems: 'center', fontSize: '30px', fontWeight: 700, letterSpacing: '0.04em' }, [
        el('span', { color: INK }, 'Cele'),
        el('span', { color: ACCENT }, 'story'),
      ]),
      // hero block
      el('div', { display: 'flex', flexDirection: 'column', gap: '10px' }, [
        el('div', { fontSize: '26px', fontWeight: 400, color: INK_DIM, letterSpacing: '0.14em' }, opts.eyebrow.toUpperCase()),
        el(
          'div',
          {
            fontSize: `${opts.heroSize ?? 136}px`,
            fontWeight: 700,
            lineHeight: '1',
            color: opts.heroAccent === false ? INK : ACCENT,
          },
          opts.hero,
        ),
        el('div', { fontSize: '28px', fontWeight: 400, color: INK }, opts.sub),
      ]),
      // stat row
      el('div', { display: 'flex', gap: '64px' }, opts.stats.map(stat)),
    ],
  );
}

/** Build a PNG buffer from an element tree. */
async function toPng(element: OgEl): Promise<Buffer> {
  // Satori consumes this plain vnode shape; @vercel/og types want a ReactElement,
  // so we cast at the boundary (no JSX/React in this server module).
  const response = new ImageResponse(
    element as unknown as ConstructorParameters<typeof ImageResponse>[0],
    { width: WIDTH, height: HEIGHT, fonts: fonts() },
  );
  return Buffer.from(await response.arrayBuffer());
}

/** Render a personalised profile card (handle + headline stats). */
export function profileCardPng(model: OgProfileModel): Promise<Buffer> {
  return toPng(
    card({
      eyebrow: `@${model.handle}`,
      hero: `${model.hours}h`,
      sub: 'under the stars',
      stats: [
        { value: model.objects, label: 'Targets' },
        { value: model.nights, label: 'Nights' },
        { value: model.frames, label: 'Light frames' },
      ],
    }),
  );
}

/** Render the generic brand card for the landing / leaderboards links. */
export function brandCardPng(opts: { eyebrow: string; hero: string; sub: string }): Promise<Buffer> {
  return toPng(
    card({
      eyebrow: opts.eyebrow,
      hero: opts.hero,
      heroAccent: false,
      heroSize: 104,
      sub: opts.sub,
      stats: [
        { value: 'Private', label: 'Runs in your browser' },
        { value: 'Shareable', label: 'Gallery-grade cards' },
      ],
    }),
  );
}
