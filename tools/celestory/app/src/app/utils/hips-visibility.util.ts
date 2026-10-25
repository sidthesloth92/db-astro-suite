/**
 * Which HEALPix cells to draw for a view: hierarchical refinement from order 3
 * down to the target order, keeping cells whose centre lies within the view
 * cone (padded by the cell's own angular radius).
 */
import { HIPS_SURVEY } from '../models/hips.constants';
import type { Vec3 } from '../models/sky.types';
import { cellCenter, healpixNpix } from './healpix.util';

/** Angular radius (radians) that safely encloses any cell at `order`. */
export function cellRadiusRad(order: number): number {
  // Base cells span ~58.6°; the diagonal of a cell is ~1.5× the edge.
  return ((58.63 / (1 << order)) * 0.78 * Math.PI) / 180;
}

/** HiPS order whose tile pixels roughly match the screen pixel scale. */
export function orderForPixelScale(degPerScreenPx: number): number {
  const k = Math.ceil(Math.log2(58.63 / (HIPS_SURVEY.tileSize * degPerScreenPx)));
  return Math.max(HIPS_SURVEY.minOrder, Math.min(HIPS_SURVEY.maxOrder, k));
}

/** Nested cell indices at `order` intersecting the cone (axis, radius in radians). */
export function visibleCells(order: number, axis: Vec3, coneRadiusRad: number): number[] {
  const startOrder = Math.min(HIPS_SURVEY.minOrder, order);
  let cells: number[] = [];
  const nStart = healpixNpix(startOrder);
  for (let p = 0; p < nStart; p++) cells.push(p);
  for (let o = startOrder; ; o++) {
    const limit = Math.cos(Math.min(Math.PI, coneRadiusRad + cellRadiusRad(o)));
    cells = cells.filter((p) => {
      const c = cellCenter(o, p);
      return c.x * axis.x + c.y * axis.y + c.z * axis.z >= limit;
    });
    if (o === order) {
      return cells;
    }
    const next: number[] = [];
    for (const p of cells) {
      const base = p * 4;
      next.push(base, base + 1, base + 2, base + 3);
    }
    cells = next;
  }
}
