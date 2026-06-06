/**
 * Generates static redirect stubs for legacy URLs that have moved, so search
 * engines that still have the old URLs indexed are forwarded to the new ones
 * and the accumulated ranking signals transfer across.
 *
 * GitHub Pages is a static host with no server-side 301 support, so each stub
 * uses an instant `<meta http-equiv="refresh">` plus a `rel="canonical"` link —
 * the combination Google treats as a permanent redirect. For each mapping both
 * URL forms are emitted (`/old.html` and `/old/index.html`) to cover whichever
 * variant was indexed.
 *
 * The `/dossier/*` paths were the previous home of the tool description pages,
 * renamed to `/tool/*`. Files are written under `hub/public/`, which the hub
 * build copies to `dist/`, so they deploy to https://dbastrosuite.com/dossier/*.
 *
 * Usage: node scripts/generate-redirects.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ORIGIN = 'https://dbastrosuite.com';

/** Legacy path (no leading host) → current path. */
const REDIRECTS = [
  { from: '/dossier/astrogram', to: '/tool/astrogram' },
  { from: '/dossier/starwizz', to: '/tool/starwizz' },
  // The File Grouper tool was renamed to Sortronomy: its page moved from
  // /tool/file-grouper to /tool/sortronomy, and the legacy /dossier path points
  // straight at the new URL (no redirect chain).
  { from: '/dossier/file-grouper', to: '/tool/sortronomy' },
  { from: '/tool/file-grouper', to: '/tool/sortronomy' },
];

/**
 * Builds the redirect HTML pointing at the given destination path.
 * @param {string} toPath - Absolute site path to redirect to (e.g. /tool/astrogram).
 * @returns {string} A minimal HTML document that redirects and canonicalises.
 */
function buildRedirect(toPath) {
  const target = `${SITE_ORIGIN}${toPath}`;
  return (
    `<!doctype html>\n` +
    `<html lang="en">\n` +
    `  <head>\n` +
    `    <meta charset="utf-8" />\n` +
    `    <title>Redirecting…</title>\n` +
    `    <link rel="canonical" href="${target}" />\n` +
    `    <meta name="robots" content="noindex, follow" />\n` +
    `    <meta http-equiv="refresh" content="0; url=${target}" />\n` +
    `  </head>\n` +
    `  <body>\n` +
    `    <p>This page has moved to <a href="${target}">${target}</a>.</p>\n` +
    `  </body>\n` +
    `</html>\n`
  );
}

const publicDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'hub',
  'public',
);

let count = 0;
for (const { from, to } of REDIRECTS) {
  const html = buildRedirect(to);
  // Cover both `/old` (served from old.html) and `/old/` (served from old/index.html).
  const flatPath = resolve(publicDir, `.${from}.html`);
  const dirIndexPath = resolve(publicDir, `.${from}`, 'index.html');
  mkdirSync(dirname(flatPath), { recursive: true });
  mkdirSync(dirname(dirIndexPath), { recursive: true });
  writeFileSync(flatPath, html, 'utf8');
  writeFileSync(dirIndexPath, html, 'utf8');
  count += 2;
}

console.log(`Generated ${count} redirect stub(s) for ${REDIRECTS.length} legacy path(s) under ${publicDir}/dossier`);
