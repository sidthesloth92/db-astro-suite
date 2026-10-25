/** Greedy label collision avoidance for the sky overlay. */

/** An axis-aligned label rectangle in CSS pixels. */
export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Try to place a label at (x, y); if it collides with an already-placed box,
 * try a few nearby offsets. Returns the accepted box (and records it) or null.
 */
export function placeLabel(placed: LabelBox[], x: number, y: number, w: number, h: number): LabelBox | null {
  const candidates: LabelBox[] = [
    { x, y, w, h },
    { x, y: y - h - 2, w, h },
    { x, y: y + h + 2, w, h },
    { x: x - w - 14, y, w, h },
  ];
  for (const c of candidates) {
    if (!placed.some((p) => overlaps(p, c))) {
      placed.push(c);
      return c;
    }
  }
  return null;
}
