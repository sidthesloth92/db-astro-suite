import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";
import { BEATS } from "./beats";
import { Director } from "../../engine/capture/director";
import { FORMATS, currentFormat } from "../../engine/capture/formats";
import { demoRuntimeScript } from "../../engine/capture/page-runtime";
import { AstroSpikeDemoPage } from "./pages/astrospike-demo.page";
import { DesktopShell } from "./shells/desktop.shell";
import { MobileShell } from "./shells/mobile.shell";

/** Playback frame rate of the finished video. */
const FPS = 30;

/** Which cut this run captures; the Playwright config reads the same table. */
const FORMAT = currentFormat();

/** Clips and manifest are kept apart per app and format so a render never mixes them. */
const OUT_DIR = path.resolve(__dirname, "../../out/astrospike", FORMAT);

/**
 * How far the studio's own CSS transitions are stretched.
 *
 * Frame-stepping means ~150-250ms of real time passes between captured frames,
 * so an unmodified 220ms transition would start and finish inside one frame and
 * read as a hard snap. Scaling durations up spreads them over several frames.
 * Tune with DEMO_MOTION_SCALE if the capture host is much faster or slower.
 */
const MOTION_SCALE = Number(process.env.DEMO_MOTION_SCALE ?? "5");

/** Optional comma-separated beat ids, for iterating on one segment. */
const ONLY = process.env.DEMO_BEATS?.split(",").map((id) => id.trim()).filter(Boolean);

test(`captures the AstroSpike demo (${FORMAT})`, async ({ page }) => {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.addInitScript({ content: demoRuntimeScript(MOTION_SCALE) });

  const director = new Director(
    page,
    OUT_DIR,
    FPS,
    FORMATS[FORMAT].deviceScaleFactor,
  );
  const shell = FORMAT === "desktop" ? new DesktopShell() : new MobileShell();
  const app = new AstroSpikeDemoPage(page, director, shell);

  // Open once before recording so the dev server has compiled and the sample
  // has been through detection; otherwise the first captured frames would be a
  // blank Angular build rather than the studio launching.
  await app.open();

  const beats = ONLY === undefined ? BEATS : BEATS.filter((b) => ONLY.includes(b.id));
  if (beats.length === 0) {
    throw new Error(`no beats matched DEMO_BEATS="${process.env.DEMO_BEATS}"`);
  }

  for (const beat of beats) {
    process.stdout.write(`beat ${beat.id}\n`);
    director.beginClip(beat.id);
    await beat.run(app, director);
    await director.endClip();
  }

  const { width, height } = FORMATS[FORMAT].frame;
  const manifest = director.manifest(width, height);
  writeFileSync(
    path.join(OUT_DIR, "beats.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  process.stdout.write(
    `\n[${FORMAT}] ${manifest.totalFrames} frames ` +
      `(${(manifest.totalFrames / FPS).toFixed(1)}s), ` +
      `${manifest.clips.length} clips, ${manifest.captions.length} captions, ` +
      `${manifest.focuses.length} focus spans\n`,
  );

  // A caption's span ends when the next one starts, so a beat that finishes
  // faster than expected silently leaves its caption on screen too briefly to
  // read. That is invisible in the clips and only shows up on playback, so it
  // is reported here instead.
  const MIN_READABLE_FRAMES = 45;
  const rushed = manifest.captions.filter(
    (caption) => caption.end - caption.start < MIN_READABLE_FRAMES,
  );
  for (const caption of rushed) {
    process.stdout.write(
      `  too brief to read (${caption.end - caption.start}f): ${caption.id}\n`,
    );
  }
});
