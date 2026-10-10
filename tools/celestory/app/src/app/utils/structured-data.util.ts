/**
 * SSR-safe JSON-LD injector. Maintains a single `<script id="ld-json"
 * type="application/ld+json">` slot in `<head>`, replacing its contents on each
 * call so client-side navigations never accumulate stale structured data.
 */

/** The single JSON-LD slot's element id. */
const SLOT_ID = 'ld-json';

/** Write the page's JSON-LD structured data, or remove the slot when `data` is null. */
export function setStructuredData(doc: Document, data: object | null): void {
  const head = doc.head;
  if (!head) {
    return;
  }
  const existing = doc.getElementById(SLOT_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing ?? doc.createElement('script');
  if (!existing) {
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', SLOT_ID);
    head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
