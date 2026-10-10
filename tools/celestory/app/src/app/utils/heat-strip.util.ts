/**
 * Boundary-aware `left` for an element centred on `leftPct` of its track via
 * `translateX(-50%)`. Clamps the anchor to stay at least `halfPx` from either
 * edge so the centred element (a hover tooltip or milestone chip) never overflows
 * — and therefore is never clipped by the heat strip's scroll container. The `%`
 * and `100%` resolve against the rendered track width, so it holds whether the
 * track scrolls or fits the panel.
 */
export function edgeClampLeft(leftPct: number, halfPx: number): string {
  return `clamp(${halfPx}px, ${leftPct}%, calc(100% - ${halfPx}px))`;
}
