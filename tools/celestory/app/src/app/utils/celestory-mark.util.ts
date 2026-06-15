/**
 * Builds the Celestory brand-mark geometry — an exact port of the canonical
 * design (Celestory Logo.html). The mark is a session-log crescent "C": a
 * deterministic dotted grid of your nights under the sky, forming the brand
 * initial, coloured by a random cyan↔pink scatter. The `full` variant pairs the
 * crescent with a three-step moon-phase story (hero + primary mark); the
 * `icon` variant is the crescent alone (header, app icon, avatar). Same seed,
 * same dots. Each primitive carries optional launch-animation metadata
 * (role/rank/delay/seed) the static render ignores.
 */
import { MARK_CYAN, MARK_DIM, MARK_PINK } from '../models/celestory-mark.constants';
import type { CrescentSpec, MarkGeometry, MarkPrimitive, MarkVariant } from '../models/celestory-mark.types';
import { hexLerp } from './color.util';

/** Lit-cell threshold — cells whose random value clears this are coloured. */
const LIT_THRESHOLD = 0.22;
/** Cell grid pitch, as a fraction of the crescent radius (× dot scale). */
const GAP_RATIO = 0.16818;
/** Cell side length, as a fraction of the crescent radius (× dot scale). */
const DOT_RATIO = 0.12273;
/** Cut-out disk radius, as a fraction of the crescent radius. */
const CUT_R_RATIO = 0.90909;
/** Cut-out disk centre x offset from the crescent centre. */
const CUT_X_RATIO = 0.45455;
/** Cut-out disk centre y offset from the crescent centre. */
const CUT_Y_RATIO = 0.27273;
/** Cell corner radius, as a fraction of the cell side. */
const CELL_RX_RATIO = 0.26;

/** Full-mark crescent placement (viewBox `0 0 165 132`). */
const FULL_CRESCENT: CrescentSpec = { bx: 45, by: 52, br: 41, dot: 0.5, seed: 7 };
/** Icon crescent placement (viewBox `10 10 100 100`). */
const ICON_CRESCENT: CrescentSpec = { bx: 60, by: 60, br: 46, dot: 0.5, seed: 7 };

/**
 * Generate the crescent's session-dot grid: a square grid masked into a
 * crescent (inside the outer disk, outside an offset cut-out disk). The seeded
 * RNG is advanced once per kept cell, in row-major order, so the scatter is
 * fully deterministic for a given seed.
 */
function genCrescent({ bx, by, br, dot, seed }: CrescentSpec): MarkPrimitive[] {
  let sd = seed;
  const rnd = (): number => {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    return sd / 0x7fffffff;
  };
  const gap = br * GAP_RATIO * dot;
  const s = br * DOT_RATIO * dot;
  const cr = br * CUT_R_RATIO;
  const cx = bx + br * CUT_X_RATIO;
  const cy = by - br * CUT_Y_RATIO;
  const x0 = bx - br - 2;
  const y0 = by - br - 4;
  const cols = Math.ceil((br * 2 + 8) / gap);
  const rows = Math.ceil((br * 2 + 8) / gap);
  const side = +s.toFixed(2);
  const rx = +(s * CELL_RX_RATIO).toFixed(2);
  const cells: MarkPrimitive[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x0 + c * gap;
      const py = y0 + r * gap;
      const ccx = px + s / 2;
      const ccy = py + s / 2;
      if (Math.hypot(ccx - bx, ccy - by) <= br && Math.hypot(ccx - cx, ccy - cy) > cr) {
        const v = rnd();
        const lit = v > LIT_THRESHOLD;
        cells.push({
          kind: 'rect',
          x: +px.toFixed(2),
          y: +py.toFixed(2),
          w: side,
          h: side,
          rx,
          // Random cyan↔pink scatter (not a positional gradient).
          fill: lit ? hexLerp(MARK_CYAN, MARK_PINK, v) : MARK_DIM,
          opacity: lit ? 0.55 + v * 0.45 : 1,
          role: 'cell',
          seed: v,
        });
      }
    }
  }
  return cells;
}

/** Rank crescent cells by their random value so the pop-in scatters (0..1). */
function rankCells(cells: MarkPrimitive[]): void {
  const order = cells.map((_, i) => i).sort((a, b) => (cells[a].seed ?? 0) - (cells[b].seed ?? 0));
  const n = order.length;
  order.forEach((idx, k) => {
    cells[idx].rank = n > 1 ? k / (n - 1) : 0;
  });
}

/**
 * A waxing moon-phase disk: a faint ring with the lit fraction filled on the
 * right. The ring is always drawn first; a full phase fills the whole disk, a
 * partial phase fills a terminator path.
 */
function phase(
  cx: number,
  cy: number,
  r: number,
  p: number,
  color: string,
  delay: number,
): MarkPrimitive[] {
  const tag = (prim: MarkPrimitive): MarkPrimitive => ({ ...prim, role: 'phase', delay });
  const ring = tag({ kind: 'circle', cx, cy, r, fill: null, stroke: color, sw: 0.9, opacity: 0.25 });
  if (p >= 0.999) {
    return [ring, tag({ kind: 'circle', cx, cy, r, fill: color })];
  }
  const rx = Math.abs(r * Math.cos(Math.PI * p));
  const sweep = p < 0.5 ? 0 : 1;
  return [
    ring,
    tag({
      kind: 'path',
      d: `M${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`,
      fill: color,
    }),
  ];
}

/** Build the geometry for the requested brand-mark variant. */
export function buildMarkGeometry(variant: MarkVariant): MarkGeometry {
  if (variant === 'icon') {
    const cells = genCrescent(ICON_CRESCENT);
    rankCells(cells);
    return { viewBox: '10 10 100 100', heightRatio: 1, shapes: cells };
  }
  const cells = genCrescent(FULL_CRESCENT);
  rankCells(cells);
  const phases: Array<[number, number]> = [
    [78, 0.45],
    [101, 0.72],
    [124, 1],
  ];
  return {
    viewBox: '0 0 138 104',
    heightRatio: 104 / 138,
    shapes: [
      ...cells,
      ...phases.flatMap((d, i) =>
        phase(d[0], 50, 9, d[1], hexLerp(MARK_CYAN, MARK_PINK, 0.5 + i * 0.25), 700 + i * 140),
      ),
    ],
  };
}
