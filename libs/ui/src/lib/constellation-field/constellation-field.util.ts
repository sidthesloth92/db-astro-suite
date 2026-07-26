import {
  CF_CYAN,
  CF_DENSITY_DIVISOR,
  CF_LINE_STOPS,
  CF_MAX_POINTS,
  CF_PINK,
  CF_TAGGED_COUNT,
} from './constellation-field.constants';
import type { FieldPoint, TaggedStar } from './constellation-field.model';

/** Samples the pink→purple→blue line gradient at `t` (0..1) → `rgb(r,g,b)`. */
export function lerpLineColor(t: number): string {
  const seg = t * 2;
  const i = Math.min(1, Math.floor(seg));
  const f = seg - i;
  const a = CF_LINE_STOPS[i];
  const b = CF_LINE_STOPS[i + 1];
  const channel = (k: number): number => (a[k] + (b[k] - a[k]) * f) | 0;
  return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
}

/** Seeds the drifting background points for a `w`×`h` field, capped at `maxPoints`. */
export function createPoints(w: number, h: number, maxPoints = CF_MAX_POINTS): FieldPoint[] {
  const count = Math.round(Math.min(maxPoints, (w * h) / CF_DENSITY_DIVISOR));
  const points: FieldPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.6 + Math.random() * 1.7,
      tw: Math.random() * Math.PI * 2,
      tws: 0.6 + Math.random() * 1.4,
      depth: 0.3 + Math.random() * 0.7,
    });
  }
  return points;
}

/** Seeds `count` tagged anchor stars (alternating pink / cyan reticles). */
export function createTagged(w: number, h: number, count = CF_TAGGED_COUNT): TaggedStar[] {
  const tagged: TaggedStar[] = [];
  for (let i = 0; i < count; i++) {
    tagged.push({
      x: (0.18 + 0.66 * Math.random()) * w,
      y: (0.18 + 0.64 * Math.random()) * h,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      pulse: Math.random() * Math.PI * 2,
      color: i % 2 ? CF_CYAN : CF_PINK,
    });
  }
  return tagged;
}
