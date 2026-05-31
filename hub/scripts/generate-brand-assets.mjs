/**
 * Generates the DB Astro Suite raster brand assets from the crescent logo:
 *   - assets/img/og-dbastrosuite.png  (1200×630 social share card)
 *   - apple-touch-icon.png            (180×180 home-screen / share icon)
 *
 * Rendered with the bundled headless Chromium (via @playwright/test) so the
 * Orbitron wordmark matches the in-app lockup. Run from the hub package:
 *   node scripts/generate-brand-assets.mjs [outDir]
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const outDir = process.argv[2] ? resolve(process.argv[2]) : resolve(here, '../public');

const PINK = '#ff2d95';
const CYAN = '#00E5FF';
const WHITE = '#e6e6ef';
const INK = '#05060A';

const orbitron = readFileSync(
  resolve(repoRoot, 'libs/theme/fonts/Orbitron-Bold.ttf'),
).toString('base64');

/** The crescent + DB + shimmering-star mark (settled state), literal colours. */
const crescent = (size) => `
  <svg width="${size}" height="${size}" viewBox="0 0 120 120" style="overflow:visible;flex:none">
    <defs><mask id="cr"><circle cx="58" cy="60" r="42" fill="#fff"/><circle cx="78" cy="60" r="38" fill="#000"/></mask></defs>
    <circle cx="58" cy="60" r="42" fill="${PINK}" mask="url(#cr)" style="filter:drop-shadow(0 0 10px ${PINK}aa)"/>
    <text x="65" y="68" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="28" fill="${WHITE}">D</text>
    <text x="88" y="68" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="28" fill="${WHITE}">B</text>
    <text x="55" y="80" text-anchor="start" font-family="Arial, sans-serif" font-weight="700" font-size="8" letter-spacing="0.5"><tspan fill="${WHITE}">ASTRO</tspan><tspan fill="${PINK}">SUITE</tspan></text>
    <path d="M 96 28 L 98.6 38 L 108 41 L 98.6 44 L 96 54 L 93.4 44 L 84 41 L 93.4 38 Z" fill="${CYAN}"/>
    <path d="M 80 18 L 81 22 L 85 23 L 81 24 L 80 28 L 79 24 L 75 23 L 79 22 Z" fill="${WHITE}"/>
    <path d="M 111 52 L 112 56 L 116 57 L 112 58 L 111 62 L 110 58 L 106 57 L 110 56 Z" fill="${CYAN}"/>
  </svg>`;

const fontFace = `@font-face{font-family:'Orbitron';src:url(data:font/ttf;base64,${orbitron}) format('truetype');font-weight:700;}`;

/** Sparse decorative starfield dots for the share card. */
const stars = Array.from({ length: 60 }, (_, i) => {
  const s = i * 9301 + 49297;
  const x = ((s % 233280) / 233280) * 1200;
  const y = (((s * 7) % 233280) / 233280) * 630;
  const r = 0.6 + ((s * 3) % 100) / 100 * 1.4;
  const c = i % 7 === 0 ? CYAN : i % 11 === 0 ? PINK : '#ffffff';
  const o = 0.15 + ((s * 5) % 100) / 100 * 0.4;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${c}" opacity="${o.toFixed(2)}"/>`;
}).join('');

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFace}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;background:
    radial-gradient(ellipse 60% 70% at 18% 88%, ${PINK}22, transparent 60%),
    radial-gradient(ellipse 60% 70% at 85% 12%, ${CYAN}1c, transparent 60%),
    radial-gradient(ellipse 120% 120% at 50% 50%, #0b0c16, ${INK});
    display:flex;flex-direction:column;align-items:center;justify-content:center}
  .stars{position:absolute;inset:0}
  .mark{z-index:1;filter:drop-shadow(0 0 60px ${PINK}33);line-height:0}
  .tagline{z-index:1;margin-top:34px;font-family:Arial,Helvetica,sans-serif;font-size:20px;letter-spacing:5px;
    text-transform:uppercase;color:#8B92A6;white-space:nowrap}
  .domain{z-index:1;margin-top:26px;display:flex;align-items:center;gap:11px;font-family:Arial,sans-serif;
    font-size:17px;letter-spacing:4px;text-transform:uppercase;color:#5A6175}
  .dot{width:8px;height:8px;border-radius:50%;background:${CYAN};box-shadow:0 0 12px ${CYAN}}
</style></head><body>
  <div class="card">
    <svg class="stars" width="1200" height="630">${stars}</svg>
    <div class="mark">${crescent(312)}</div>
    <div class="tagline">A collection of astro tools to go from sensor to social</div>
    <div class="domain"><span class="dot"></span>dbastrosuite.com</div>
  </div>
</body></html>`;

const iconHtml = (px) => `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFace}
  *{margin:0;box-sizing:border-box}
  body{width:${px}px;height:${px}px}
  .icon{width:${px}px;height:${px}px;background:${INK};display:flex;align-items:center;justify-content:center}
</style></head><body><div class="icon">${crescent(px * 0.82)}</div></body></html>`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  // Share card — 1200×630
  let page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(ogHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(resolve(outDir, 'assets/img/og-dbastrosuite.png'), await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
  await page.close();

  // Apple touch icon — 180×180
  page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await page.setContent(iconHtml(180), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(resolve(outDir, 'apple-touch-icon.png'), await page.screenshot({ clip: { x: 0, y: 0, width: 180, height: 180 } }));
  await page.close();

  console.log('Generated brand assets in', outDir);
} finally {
  await browser.close();
}
