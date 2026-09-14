/**
 * Largest factor a theme canvas may grow by to fit its content. Beyond this
 * the type would shrink past legibility, so the rare card that still does not
 * fit keeps that size rather than turning into fine print.
 */
export const MAX_CONTENT_FIT_FACTOR = 1.75;

/** Overflow below this ratio is sub-pixel rounding, not clipped text. */
export const CONTENT_FIT_TOLERANCE = 1.002;

/** Maximum grow-and-remeasure passes before settling on the best factor. */
export const CONTENT_FIT_MAX_PASSES = 6;

/** Namespace of SVG elements, whose text is skipped. */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * How far the text inside a card theme runs past the space it has, as a ratio
 * of that space: `1` when every line fits, `1.2` when some text needs 20% more
 * height (or width, for a line that may not wrap) than it is given.
 *
 * Only text is measured. Themes deliberately bleed decorative art — glows,
 * halo blobs, oversized chart artboards — past their edges, so a box-based
 * check (`scrollHeight`) reports overflow on cards that are perfectly fine.
 * A text node, by contrast, is always content the user needs to read.
 *
 * Each text run is checked against the theme root and against every ancestor
 * between them that clips its overflow or draws a border around it (a panel, a
 * film frame), so text cut off by — or spilling past — a panel counts even when
 * the panel itself fits the card.
 *
 * @param root The theme's root element (the host's first child).
 */
export function measureTextOverflow(root: HTMLElement): number {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const clipBoxes = new Map<Element, DOMRect>();
  const rootBox = root.getBoundingClientRect();
  if (rootBox.height <= 0) return 1;

  let worst = 1;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent || !node.textContent.trim()) continue;
    // SVG labels live inside their chart's viewBox and range rects are not
    // reliable there; the charts are sized by their themes, not by text flow.
    if (node.parentElement?.namespaceURI === SVG_NAMESPACE) continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) continue;
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const right = Math.max(...rects.map((r) => r.right));

    worst = Math.max(worst, overflowRatio(bottom, right, rootBox));

    for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
      if (!boundsText(el)) continue;
      let box = clipBoxes.get(el);
      if (!box) {
        box = el.getBoundingClientRect();
        clipBoxes.set(el, box);
        // A panel that holds text must itself fit the card: its border or a
        // meter along its bottom edge running off the card is as broken as
        // clipped text, even when the text inside still fits.
        worst = Math.max(worst, overflowRatio(box.bottom, box.right, rootBox));
      }
      worst = Math.max(worst, overflowRatio(bottom, right, box));
    }
  }
  return worst;
}

/**
 * How far a text run's far edges pass a box, as a ratio of the box's size on
 * that axis. Text only ever overruns downward (wrapping) or rightward (a line
 * that may not wrap), so those are the two edges checked.
 */
function overflowRatio(bottom: number, right: number, box: DOMRect): number {
  const down = box.height > 0 ? (bottom - box.top) / box.height : 1;
  const across = box.width > 0 ? (right - box.left) / box.width : 1;
  return Math.max(down, across);
}

/**
 * Whether an element bounds the text inside it: it hides overflow, or it draws
 * a border — a bordered panel frames its text, so text past the border reads
 * as broken even where nothing clips it.
 */
function boundsText(el: Element): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!style) return false;
  if (/hidden|clip/.test(style.overflowY) || /hidden|clip/.test(style.overflowX)) return true;
  const drawn = (width: string, line: string): boolean => parseFloat(width) > 0 && line !== 'none';
  return (
    drawn(style.borderTopWidth, style.borderTopStyle) &&
    drawn(style.borderBottomWidth, style.borderBottomStyle)
  );
}
