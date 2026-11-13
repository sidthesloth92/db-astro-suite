/**
 * Radii for `count` concentric rings, one per band, that always fit between
 * `minInner` and `outer`.
 *
 * Rings start at `inner` and step out by `step`, as a design authored for a
 * few bands draws them. Once that would pass `outer`, the rings pull inward
 * (no further than `minInner`) and then tighten their spacing, so a seventh
 * band still gets a ring inside the chart instead of one drawn past its edge.
 *
 * @param count Number of rings.
 * @param inner Preferred innermost radius.
 * @param step Preferred distance between neighbouring rings.
 * @param outer Largest radius a ring may have.
 * @param minInner Smallest radius the innermost ring may move in to.
 */
export function ringRadii(
  count: number,
  inner: number,
  step: number,
  outer: number,
  minInner: number,
): number[] {
  if (count <= 0) return [];
  const spacing = count > 1 ? Math.min(step, (outer - minInner) / (count - 1)) : step;
  const first = Math.min(inner, outer - (count - 1) * spacing);
  return Array.from({ length: count }, (_unused, i) => first + i * spacing);
}
