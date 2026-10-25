#!/usr/bin/env node
/**
 * Builds the planetarium's sky assets into `public/sky/` from raw sources that
 * are NOT committed (see docs/planetarium-rendering.md for where to get them).
 *
 *   node scripts/build-sky-assets.mjs --src /path/to/skysrc [--out public/sky] [--skip-milkyway]
 *
 * Expected files in --src:
 *   milkyway_2020_8k.exr        NASA SVS 4851 (Milky Way, bright stars omitted)
 *   lroc_color_poles_4k.tif     NASA SVS 4720 (Moon colour map)
 *   hipparcos.csv               VizieR I/239/hip_main: HIP,RAICRS,DEICRS,Vmag,B-V,Plx
 *   tycho2.csv                  VizieR I/259/tyc2: RAmdeg,DEmdeg,BTmag,VTmag,HIP  (VTmag < 10.5)
 *   constellations.lines.json   d3-celestial
 *   constellations.json         d3-celestial
 *   starnames.json              d3-celestial
 *
 * Requires `ffmpeg` on PATH (EXR/TIFF decode, WebP encode). No npm dependencies.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const SRC = resolve(opt('--src', ''));
const OUT = resolve(opt('--out', 'public/sky'));
const SKIP_MW = args.includes('--skip-milkyway');
if (!SRC || !existsSync(SRC)) {
  console.error('usage: build-sky-assets.mjs --src <dir-with-raw-sources> [--out public/sky]');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const TMP = join(tmpdir(), `sky-assets-${process.pid}`);
mkdirSync(TMP, { recursive: true });

const D2R = Math.PI / 180;
const log = (...m) => console.log('[sky-assets]', ...m);
const ffmpeg = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// Milky Way: EXR (linear float) → gamma-encoded 8-bit equirect WebP (8k + 4k).
// Encoding: e = pow(clamp(v / MW_SCALE, 0, 1), 1 / MW_GAMMA). The shader inverts it.
// ---------------------------------------------------------------------------
const MW_SCALE = 0.4;
const MW_GAMMA = 2.4;

function buildMilkyWay() {
  const exr = join(SRC, 'milkyway_2020_8k.exr');
  if (!existsSync(exr)) throw new Error(`missing ${exr}`);
  // AVIF keeps the faint-star grain at a third of the WebP size; the 4k WebP is the
  // fallback for browsers without AVIF decode.
  for (const [w, h, outputs] of [
    [8192, 4096, [['milkyway-8k.avif', ['-c:v', 'libaom-av1', '-crf', '26', '-cpu-used', '6', '-still-picture', '1', '-pix_fmt', 'yuv420p10le', '-frames:v', '1', '-f', 'avif']]]],
    [
      4096,
      2048,
      [
        ['milkyway-4k.avif', ['-c:v', 'libaom-av1', '-crf', '24', '-cpu-used', '6', '-still-picture', '1', '-pix_fmt', 'yuv420p10le', '-frames:v', '1', '-f', 'avif']],
        ['milkyway-4k.webp', ['-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', '-preset', 'picture']],
      ],
    ],
  ]) {
    log(`Milky Way ${w}x${h}: decoding EXR`);
    const raw = join(TMP, `mw_${w}.f32`);
    ffmpeg(['-i', exr, '-vf', `scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gbrpf32le', raw]);
    const buf = readFileSync(raw);
    const n = w * h;
    const f = new Float32Array(buf.buffer, buf.byteOffset, n * 3); // planes G, B, R
    const out = Buffer.alloc(n * 3);
    const enc = (v) => Math.round(255 * Math.pow(Math.min(1, Math.max(0, v / MW_SCALE)), 1 / MW_GAMMA));
    for (let i = 0; i < n; i++) {
      out[i * 3] = enc(f[2 * n + i]);
      out[i * 3 + 1] = enc(f[i]);
      out[i * 3 + 2] = enc(f[n + i]);
    }
    const ppm = join(TMP, `mw_${w}.ppm`);
    writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), out]));
    rmSync(raw);
    for (const [name, encArgs] of outputs) {
      log(`Milky Way ${w}x${h}: encoding ${name}`);
      ffmpeg(['-i', ppm, ...encArgs, join(OUT, name)]);
    }
    rmSync(ppm);
  }
}

// ---------------------------------------------------------------------------
// Moon colour map → 2k WebP
// ---------------------------------------------------------------------------
function buildMoon() {
  const tif = join(SRC, 'lroc_color_poles_4k.tif');
  if (!existsSync(tif)) throw new Error(`missing ${tif}`);
  log('Moon: encoding 2k WebP');
  ffmpeg(['-i', tif, '-vf', 'scale=2048:1024:flags=area', '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6', join(OUT, 'moon-2k.webp')]);
}

// ---------------------------------------------------------------------------
// Star catalogues → packed binary (see docs: STR1 header, 8-byte records)
// ---------------------------------------------------------------------------
function parseCsv(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const header = lines[0].trim().split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const cells = l.split(',');
    const row = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = cells[c] ?? '';
    rows.push(row);
  }
  return rows;
}

function packStars(stars, path) {
  stars.sort((a, b) => a.mag - b.mag);
  const buf = Buffer.alloc(8 + stars.length * 8);
  buf.write('STR1', 0, 'ascii');
  buf.writeUInt32LE(stars.length, 4);
  let o = 8;
  for (const s of stars) {
    const ra = s.ra * D2R;
    const dec = s.dec * D2R;
    const cd = Math.cos(dec);
    buf.writeInt16LE(Math.round(cd * Math.cos(ra) * 32767), o);
    buf.writeInt16LE(Math.round(cd * Math.sin(ra) * 32767), o + 2);
    buf.writeInt16LE(Math.round(Math.sin(dec) * 32767), o + 4);
    buf.writeUInt8(Math.max(0, Math.min(255, Math.round((s.mag + 2) * 10))), o + 6);
    buf.writeInt8(Math.max(-127, Math.min(127, Math.round(s.bv * 50))), o + 7);
    o += 8;
  }
  writeFileSync(path, buf);
  log(`${path}: ${stars.length} stars, ${(buf.length / 1024).toFixed(0)} KB, mag ${stars[0].mag} .. ${stars[stars.length - 1].mag}`);
}

function buildStars() {
  const hip = parseCsv(join(SRC, 'hipparcos.csv'));
  const hipStars = [];
  const hipById = new Map();
  for (const r of hip) {
    const ra = parseFloat(r.RAICRS);
    const dec = parseFloat(r.DEICRS);
    const mag = parseFloat(r.Vmag);
    if (!isFinite(ra) || !isFinite(dec) || !isFinite(mag)) continue;
    const bvRaw = parseFloat(r['B-V']);
    const bv = isFinite(bvRaw) ? bvRaw : 0.6;
    const s = { ra, dec, mag, bv };
    hipStars.push(s);
    hipById.set(r.HIP, s);
  }
  packStars(hipStars, join(OUT, 'stars-hip.bin'));

  const tyc = parseCsv(join(SRC, 'tycho2.csv'));
  const tycStars = [];
  for (const r of tyc) {
    if (r.HIP && r.HIP.trim() !== '') continue; // already in Hipparcos
    const ra = parseFloat(r.RAmdeg);
    const dec = parseFloat(r.DEmdeg);
    const vt = parseFloat(r.VTmag);
    if (!isFinite(ra) || !isFinite(dec) || !isFinite(vt)) continue;
    const bt = parseFloat(r.BTmag);
    const btvt = isFinite(bt) ? bt - vt : 0.7;
    tycStars.push({ ra, dec, mag: vt - 0.09 * btvt, bv: 0.85 * btvt });
  }
  packStars(tycStars, join(OUT, 'stars-tyc.bin'));
  return hipById;
}

// ---------------------------------------------------------------------------
// Constellations + star names → sky-catalog.json
// ---------------------------------------------------------------------------
const norm = (ra) => ((ra % 360) + 360) % 360;
const r3 = (x) => Math.round(x * 1000) / 1000;

function buildCatalog(hipById) {
  const lines = JSON.parse(readFileSync(join(SRC, 'constellations.lines.json'), 'utf8'));
  const names = JSON.parse(readFileSync(join(SRC, 'constellations.json'), 'utf8'));
  const starnames = JSON.parse(readFileSync(join(SRC, 'starnames.json'), 'utf8'));
  const info = new Map();
  for (const f of names.features) {
    info.set(f.id, { name: f.properties.name, gen: f.properties.gen, centre: f.geometry.coordinates });
  }
  const byId = new Map();
  for (const f of lines.features) {
    const id = f.id;
    const polylines = f.geometry.coordinates.map((pl) => pl.map(([ra, dec]) => [r3(norm(ra)), r3(dec)]));
    if (byId.has(id)) {
      byId.get(id).lines.push(...polylines);
      continue;
    }
    const meta = info.get(id) || { name: id, gen: id, centre: [0, 0] };
    byId.set(id, { id, name: meta.name, gen: meta.gen, centre: [r3(norm(meta.centre[0])), r3(meta.centre[1])], lines: polylines });
  }
  const stars = [];
  for (const [hip, n] of Object.entries(starnames)) {
    const s = hipById.get(hip);
    if (!s) continue;
    const proper = (n.name || '').trim();
    const bayer = (n.bayer || '').trim();
    if (!proper && !(bayer && s.mag < 4.0)) continue;
    stars.push({ hip: Number(hip), name: proper, bayer, con: n.c || '', ra: r3(s.ra), dec: r3(s.dec), mag: r3(s.mag) });
  }
  stars.sort((a, b) => a.mag - b.mag);
  const out = { constellations: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)), stars };
  writeFileSync(join(OUT, 'sky-catalog.json'), JSON.stringify(out));
  log(`sky-catalog.json: ${out.constellations.length} constellations, ${stars.length} named stars`);
}

function writeCredits() {
  writeFileSync(
    join(OUT, 'CREDITS.md'),
    `# Sky data credits

Built by \`scripts/build-sky-assets.mjs\`. Do not edit the binary/image files by hand.

- **milkyway-8k.webp / milkyway-4k.webp** — NASA/Goddard Space Flight Center Scientific Visualization Studio,
  "Deep Star Maps 2020" (SVS 4851), Milky Way background with Hipparcos/Tycho stars omitted.
  Gaia DR2 data: ESA/Gaia/DPAC. Equirectangular J2000, RA increases to the left, centred on RA 0h.
  Stored as pow(v / ${MW_SCALE}, 1/${MW_GAMMA}); decode to linear in the shader.
- **stars-hip.bin** — Hipparcos Catalogue (ESA 1997), VizieR I/239.
- **stars-tyc.bin** — Tycho-2 Catalogue (Høg et al. 2000), VizieR I/259, V_T < 10.5, Hipparcos duplicates removed.
- **sky-catalog.json** — constellation figures and star names from d3-celestial (Olaf Frohn, BSD-3-Clause).
- **moon-2k.webp** — NASA SVS "CGI Moon Kit" (SVS 4720), LROC WAC colour mosaic (NASA/GSFC/Arizona State University).
- **Deep-sky survey tiles (runtime)** — DSS2 colour HiPS, CDS: "Digitized Sky Survey - STScI/NASA, Colored & Healpixed by CDS", ODbL-1.0.
`,
  );
}

try {
  if (!SKIP_MW) buildMilkyWay();
  buildMoon();
  const hipById = buildStars();
  buildCatalog(hipById);
  writeCredits();
  log('done →', OUT);
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
