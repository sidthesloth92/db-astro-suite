/**
 * Share of the available width a fitted line may fill. The card exporter
 * re-lays text inside each element's frozen width, so a line fitted with zero
 * slack can still break or overhang in the downloaded file on sub-pixel
 * rounding; the margin absorbs that.
 */
export const FIT_TEXT_WIDTH_MARGIN = 0.97;

/** Font sizes are settled on this step, in px, to avoid fractional thrash. */
export const FIT_TEXT_STEP_PX = 0.5;

/**
 * Font size at which a single line of text fits its box.
 *
 * Text width scales linearly with font size (letter-spacing in `em` included),
 * so one measurement at the designed size is enough to solve for the size that
 * fills `availablePx`. The result never exceeds the designed size — a short
 * name keeps the design's scale rather than ballooning — and never drops below
 * `minPx`, where the caller should let the text wrap instead.
 *
 * @param maxPx Designed font size; the line renders at this size when it fits.
 * @param minPx Smallest legible size before wrapping takes over.
 * @param availablePx Width of the box the line must fit, in px.
 * @param neededAtMaxPx Width the line occupies when set at `maxPx`, in px.
 */
export function fitFontSize(
  maxPx: number,
  minPx: number,
  availablePx: number,
  neededAtMaxPx: number,
): number {
  if (!(maxPx > 0) || !(availablePx > 0) || !(neededAtMaxPx > 0)) return maxPx;

  const target = availablePx * FIT_TEXT_WIDTH_MARGIN;
  if (neededAtMaxPx <= target) return maxPx;

  const exact = (maxPx * target) / neededAtMaxPx;
  const stepped = Math.floor(exact / FIT_TEXT_STEP_PX) * FIT_TEXT_STEP_PX;
  return Math.max(Math.min(minPx, maxPx), stepped);
}
