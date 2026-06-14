/** One drawable SVG primitive in the Celestory brand mark. */
export interface MarkPrimitive {
  /** Which SVG element to render. */
  kind: 'rect' | 'circle' | 'path' | 'line' | 'gradline';
  // rect
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rx?: number;
  // circle
  cx?: number;
  cy?: number;
  r?: number;
  // path
  d?: string;
  // line / gradline
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // shared paint
  fill?: string | null;
  stroke?: string | null;
  sw?: number;
  opacity?: number;
  // launch-animation metadata (ignored by the static render)
  /** Which part of the mark this primitive belongs to, for the launch animation. */
  role?: 'cell' | 'phase' | 'spine' | 'node';
  /** Pop-in order for crescent cells, 0..1 (lowest reveals first). */
  rank?: number;
  /** Reveal start time in ms for phase/spine/node primitives. */
  delay?: number;
  /** Per-cell random value (twinkle phase seed), 0..1. */
  seed?: number;
}

/** The resolved geometry for a brand-mark variant. */
export interface MarkGeometry {
  /** SVG viewBox. */
  viewBox: string;
  /** Rendered height as a fraction of the requested width. */
  heightRatio: number;
  /** Primitives in paint order. */
  shapes: MarkPrimitive[];
}

/** Which brand-mark composition to build. */
export type MarkVariant = 'full' | 'icon';

/** Placement + seed for a crescent dot-grid (mirrors the design's genCrescent options). */
export interface CrescentSpec {
  /** Crescent (outer disk) centre x. */
  bx: number;
  /** Crescent (outer disk) centre y. */
  by: number;
  /** Crescent (outer disk) radius. */
  br: number;
  /** Dot-density scale — smaller packs finer cells. */
  dot: number;
  /** Seed for the deterministic cell scatter. */
  seed: number;
}
