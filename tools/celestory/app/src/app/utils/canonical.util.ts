/**
 * SSR-safe canonical-link helper. Operates on the injected `Document` (so it runs
 * server-side too — crawlers read the rendered `<head>`), find-or-creating the
 * single `<link rel="canonical">` and pointing it at the page's absolute URL.
 */

/** Set (or create) the document's `<link rel="canonical">` href. No-op when `url` is falsy. */
export function setCanonicalUrl(doc: Document, url: string | null | undefined): void {
  const head = doc.head;
  if (!url || !head) {
    return;
  }
  let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    head.appendChild(link);
  }
  link.setAttribute('href', url);
}
