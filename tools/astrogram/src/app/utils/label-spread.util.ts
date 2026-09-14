/**
 * Spreads centred labels along an axis so none is closer than `gap` to its
 * neighbour, moving each as little as possible from its anchor.
 *
 * Labels already far enough apart stay exactly on their anchors. Crowded ones
 * are pushed right, then — if that ran past `max` — pulled back from the right
 * edge. When even evenly spaced labels cannot fit at `gap`, the gap shrinks to
 * whatever the range allows, so labels never leave `[min, max]`.
 *
 * @param anchors Label anchor positions, in ascending order.
 * @param gap Minimum centre-to-centre distance.
 * @param min Smallest allowed position.
 * @param max Largest allowed position.
 */
export function spreadLabels(
  anchors: readonly number[],
  gap: number,
  min: number,
  max: number,
): number[] {
  const count = anchors.length;
  if (count === 0) return [];

  const step = count > 1 ? Math.min(gap, (max - min) / (count - 1)) : gap;
  const out = anchors.map((a) => Math.min(max, Math.max(min, a)));

  for (let i = 1; i < count; i++) {
    out[i] = Math.max(out[i], out[i - 1] + step);
  }
  if (out[count - 1] > max) {
    out[count - 1] = max;
    for (let i = count - 2; i >= 0; i--) {
      out[i] = Math.min(out[i], out[i + 1] - step);
    }
  }
  // Pulling back by `step` can land a hair outside the range in floating point.
  return out.map((x) => Math.min(max, Math.max(min, x)));
}
