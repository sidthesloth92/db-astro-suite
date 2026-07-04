/** Builds a from→now moon-phase timeline (new moon → full moon, cyan → pink). */
import { BRAND_CYAN, BRAND_PINK } from '../models/brand.constants';
import type { MoonPhase } from '../models/portfolio-view.types';
import { hexLerp } from './color.util';

/**
 * Returns `count` waxing moon phases evenly spaced from `x0` to `x1` at height
 * `y`, radius `r`. The first is a new moon (outline), the last a full moon
 * (filled); intermediates carry a lit waxing path. Colour lerps cyan→pink.
 */
export function moonPhases(count: number, x0: number, x1: number, y: number, r: number): MoonPhase[] {
  const out: MoonPhase[] = [];
  for (let i = 0; i < count; i++) {
    const p = count > 1 ? i / (count - 1) : 1;
    const cx = x0 + (x1 - x0) * p;
    const color = hexLerp(BRAND_CYAN, BRAND_PINK, p);
    if (p <= 0.001) {
      out.push({ cx, cy: y, r, color, mode: 'new' });
    } else if (p >= 0.999) {
      out.push({ cx, cy: y, r, color, mode: 'full' });
    } else {
      const rx = Math.abs(r * Math.cos(Math.PI * p));
      const sweep = p < 0.5 ? 0 : 1;
      out.push({
        cx,
        cy: y,
        r,
        color,
        mode: 'partial',
        d: `M${cx} ${y - r} A ${r} ${r} 0 0 1 ${cx} ${y + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${y - r} Z`,
      });
    }
  }
  return out;
}
