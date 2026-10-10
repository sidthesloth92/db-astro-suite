/**
 * Rasterize the brand mark (public/favicon.svg) into the PNG / ICO icon set the
 * <head> + web manifest reference. This repo has no rsvg/imagemagick/inkscape, so
 * we render with Playwright's bundled Chromium (resolved from the repo root via
 * createRequire — same approach the suite uses elsewhere for SVG → PNG).
 *
 *   node tools/celestory/app/scripts/gen-icons.mjs
 *
 * Re-run whenever favicon.svg changes; commit the regenerated assets in public/.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const BLEED_BG = '#05060A';

/** Direct (rounded mark, transparent corners) vs full-bleed (mark on a solid square). */
function pageHtml(svgDataUri, size, mode) {
  const inner = mode === 'bleed' ? Math.round(size * 0.78) : size;
  const wrap =
    mode === 'bleed'
      ? `background:${BLEED_BG};display:flex;align-items:center;justify-content:center;`
      : '';
  return `<!doctype html><html><head><style>
    *{margin:0;padding:0;border:0}
    html,body{width:${size}px;height:${size}px}
    .wrap{width:${size}px;height:${size}px;${wrap}}
    img{width:${inner}px;height:${inner}px;display:block}
  </style></head><body><div class="wrap"><img src="${svgDataUri}"></div></body></html>`;
}

/** Wrap a 32×32 PNG in a single-image ICO container (browsers accept PNG payloads). */
function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width
  entry.writeUInt8(32, 1); // height
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset (6 + 16)
  return Buffer.concat([header, entry, png]);
}

const targets = [
  { file: 'favicon-16x16.png', size: 16, mode: 'direct' },
  { file: 'favicon-32x32.png', size: 32, mode: 'direct' },
  { file: 'apple-touch-icon.png', size: 180, mode: 'bleed' },
  { file: 'icon-192.png', size: 192, mode: 'bleed' },
  { file: 'icon-512.png', size: 512, mode: 'bleed' },
  { file: 'icon-512-maskable.png', size: 512, mode: 'bleed' },
];

const svg = await readFile(join(publicDir, 'favicon.svg'), 'utf8');
const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch();
try {
  for (const target of targets) {
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(pageHtml(svgDataUri, target.size, target.mode), {
      waitUntil: 'load',
    });
    await page.waitForFunction(() => {
      const img = document.querySelector('img');
      return Boolean(img && img.complete && img.naturalWidth > 0);
    });
    const png = await page.screenshot({ omitBackground: true });
    await writeFile(join(publicDir, target.file), png);
    if (target.file === 'favicon-32x32.png') {
      await writeFile(join(publicDir, 'favicon.ico'), pngToIco(png));
    }
    await page.close();
    process.stdout.write(`✓ ${target.file}\n`);
  }
  process.stdout.write('✓ favicon.ico\n');
} finally {
  await browser.close();
}
