# Demo videos

Generates the walkthrough videos for the suite's apps — today Astrogram and
AstroSpike — in two cuts each: a 1920×1080 desktop cut for the hub's tool pages
and a 1080×1920 vertical cut for social.

Two stages that only ever talk through a manifest file:

1. **Capture** — Playwright drives the real app frame by frame and writes one
   clip per beat plus `out/<app>/<format>/beats.json`.
2. **Edit** — a Remotion project lays those clips end to end and adds the title
   card, captions, focus ring and outro.

Nothing is faked: every pixel of footage is the app running.

## Layout

```
scripts/demo-video/
  engine/capture/      shared capture engine (director, frame writer, formats,
                       page runtime, pointer) — used by every app
  astrogram/           beats, captions, page object, shells, fixtures, config
  astrospike/          the same, for AstroSpike
  remotion/            one Remotion project, four compositions
    src/engine/        shared theme, fonts, manifest types, focus ring
    src/astrogram/     that video's cards, captions and edit
    src/astrospike/    ditto
    public/            fonts, per-app stills, `clips` → symlink to ../out
  compress.mjs         makes the small delivery copies
  out/                 clips, manifests, rendered video (gitignored)
```

The apps share the engine because the two videos were built from one script and
had drifted into two near-identical copies. Anything genuinely app-specific —
what to click, what to say, which cards to show — stays in the app's folder.

## Making a video

Prerequisites: `ffmpeg` on PATH, repo dependencies installed (`pnpm install`),
and a one-off `npm install` inside `remotion/` (that project sits outside the
pnpm workspace on purpose — it is an authoring tool, not part of the suite).

```bash
# 1. capture both cuts of one app (~15 min per cut)
DEMO_FORMAT=desktop  pnpm exec playwright test --config scripts/demo-video/astrogram/playwright.demo.config.ts
DEMO_FORMAT=vertical pnpm exec playwright test --config scripts/demo-video/astrogram/playwright.demo.config.ts

# 2. render (reads the manifests the capture wrote)
npm --prefix scripts/demo-video/remotion run render:astrogram:desktop
npm --prefix scripts/demo-video/remotion run render:astrogram:vertical

# 3. make the small copies for the web
npm --prefix scripts/demo-video/remotion run compress            # every app
node scripts/demo-video/compress.mjs astrogram                   # or just one
```

Swap `astrogram` for `astrospike` for the other video. `npm --prefix
scripts/demo-video/remotion run studio` opens all four compositions for
previewing and scrubbing.

**Rewording a caption does not need a re-capture.** The manifest records which
caption id was on screen and for how long, never the words, so editing
`<app>/captions.ts` and re-rendering is enough.

Useful switches: `DEMO_BEATS=themes,sizes` captures a subset while iterating;
`DEMO_MOTION_SCALE` (default 5) stretches the app's CSS transitions so they
survive frame-stepping; `DEMO_COMPRESS_CRF` (default 26) trades size against
quality in step 3; `DEMO_ASSETS_DIR` points AstroSpike at its source photos.

## What is not in git

`out/` (clips and rendered video) and `astrospike/assets/` (the three source
photos, ~5.4 MB) are ignored. A clone can re-render from a capture, and can
re-capture once the photos are back in `astrospike/assets/`:
`pleiades.jpg`, `pleiades-portrait.jpg`, `milky-way.jpg`.

Astrogram's plate-solve fixture is committed (`astrogram/fixtures/`), so its
stellar-map beats replay without an API key. Re-record it with
`ASTROSOLVE_ACCESS_KEY=… node scripts/demo-video/astrogram/capture/record-solve.mjs`.

## Decisions worth knowing

- **Clips are all-intra (`-g 1`, CRF 14).** Remotion seeks randomly; a normal
  GOP structure makes those seeks slow enough to time out.
- **Astrogram captures on port 4211, not 4201.** A dev server left running in
  another worktree would otherwise be reused and film a different checkout.
  AstroSpike still uses its normal port (4202) — check nothing else is serving
  it before capturing.
- **Fonts and colours are copies of `libs/theme`,** not imports: Remotion's
  bundler does not follow file symlinks, and the video should not break when the
  app's tokens change mid-release.
- **Quality ladder:** CRF 14 clips → CRF 18 master → CRF 26 delivery copy.
