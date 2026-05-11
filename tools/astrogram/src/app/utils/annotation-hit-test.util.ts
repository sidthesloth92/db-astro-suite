/**
 * Performs a ring hit-test against all annotation-marker elements stacked at
 * the given screen coordinates using `document.elementsFromPoint()`.
 *
 * Returns the id of the first annotation whose ring border falls within
 * `tolerance` pixels of the click, or `null` if no ring was hit.
 */
export function findHitAnnotationId(
  event: MouseEvent,
  tolerance: number,
): string | null {
  const allElements = document.elementsFromPoint(event.clientX, event.clientY);
  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;
    if (!el.classList.contains('annotation-marker')) continue;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((event.clientX - cx) ** 2 + (event.clientY - cy) ** 2);
    const radius = rect.width / 2;

    if (Math.abs(dist - radius) <= tolerance) {
      const id = el.dataset['annotationId'];
      if (id) {
        return id;
      }
    }
  }
  return null;
}
