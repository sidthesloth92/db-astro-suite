import path from "node:path";
import type { Director } from "../../engine/capture/director";
import { currentFormat } from "../../engine/capture/formats";
import type { AstroSpikeDemoPage } from "./pages/astrospike-demo.page";

/** One captured segment of the demo. Its id names the clip file it produces. */
export interface Beat {
  id: string;
  run(app: AstroSpikeDemoPage, d: Director): Promise<void>;
}

/** Where the demo's own source photographs live. */
const ASSETS = process.env.DEMO_ASSETS_DIR ?? path.resolve(__dirname, "../assets");

/**
 * The star field the spike half of the video works on.
 *
 * Two crops of the same photograph: the full 5996 x 3747 frame fills a 16:9
 * stage, while a 9:16 one would show it as a band with dead stage above and
 * below. The portrait crop is 2248 x 3747 taken around the cluster, which fills
 * the phone stage almost exactly and is still 8 megapixels, so the export
 * beat's "same as source" line stays worth reading.
 */
const PLEIADES = path.join(
  ASSETS,
  currentFormat() === "vertical" ? "pleiades-portrait.jpg" : "pleiades.jpg",
);

/** The wide field the glow half works on. */
const MILKY_WAY = path.join(ASSETS, "milky-way.jpg");

/** How many stars the spike half drives the magnitude cut up to. */
const TARGET_STAR_COUNT = 1600;

/**
 * The stars the remove beat took spikes off, handed to the add beat so it can
 * put the same big spikes back.
 */
let removedStars: { x: number; y: number }[] = [];

/** Where the wide-field half settles its magnitude cut. */
const MW_TARGET_STAR_COUNT = 404;

/**
 * Captures frames until star detection has published a total, so the badge's
 * progress is shown rather than waited out off camera.
 */
async function holdUntilDetected(
  app: AstroSpikeDemoPage,
  d: Director,
  maxFrames: number,
): Promise<void> {
  for (let i = 0; i < maxFrames; i += 1) {
    await d.frame();
    if ((await app.detectedTotal()) > 0) {
      return;
    }
  }
}

/**
 * Drops a file through the dropzone as a visible gesture: the cursor travels
 * in, the dropzone lights under the drag, then the file lands.
 */
async function dropImage(
  app: AstroSpikeDemoPage,
  d: Director,
  file: string,
): Promise<void> {
  await app.stageDrop(file);
  const viewport = app.page.viewportSize();
  await app.glideTo(
    { x: (viewport?.width ?? 432) / 2, y: (viewport?.height ?? 768) * 0.5 },
    10,
  );
  await app.hoverDrop();
  await d.hold(8);
  await app.releaseDrop();
}


/**
 * The demo script, in order.
 *
 * This list is the single source of truth for the video: the capture walks it
 * to produce the footage, and the captions each beat sets are recorded against
 * the live frame counter, so Remotion's caption track is derived from the same
 * pass that produced the pixels. Retime a beat and both move together — the
 * captions cannot drift away from what is on screen.
 *
 * Every beat carries a line. Where one drives several controls the caption
 * changes as the control does, so the words always describe the thing that is
 * currently moving.
 *
 * The title card, the "Milky Way mode" slide and the outro are not here: they
 * are rendered in the edit, not captured from the app.
 */
export const BEATS: Beat[] = [
  {
    id: "empty",
    async run(app, d) {
      // The studio loads a sample of its own at startup. Clearing it without
      // capturing anything is what lets the video open on the empty state.
      await app.resetToEmptyState();

      d.say("private");
      await d.hold(45);

      await dropImage(app, d, PLEIADES);

      d.say("detected");
      await holdUntilDetected(app, d, 90);
      await d.hold(40);
    },
  },

  // Pacing for social: holds are as short as a result takes to register, and
  // the slider beats run back to back. On a phone the sheet stays up between
  // them (a drag ghosts it, so the photo still shows while the control moves)
  // and only comes down when the next beat needs the picture itself.
  {
    id: "magnitude",
    async run(app, d) {
      d.say("magnitude");
      await app.showControls(6);

      // Down to nothing and up to the working value in one unbroken drag, so
      // the spikes are seen leaving and arriving as a single gesture.
      const { value, total } = await app.starCountPosition(TARGET_STAR_COUNT);
      await app.sweepThrough(
        "Star magnitude",
        [await app.controlValue("Star magnitude"), 0, value],
        50,
        { hold: 8 },
      );
      process.stdout.write(`  magnitude: ${TARGET_STAR_COUNT} of ${total} detected\n`);
      await d.hold(16);
    },
  },

  {
    id: "length",
    async run(app, d) {
      d.say("length");
      await app.showControls(6);
      await app.sweepThrough("Length", [1, 0, 1.05], 42, { hold: 8 });
      await d.hold(16);
    },
  },

  {
    id: "glow",
    async run(app, d) {
      d.say("glow");
      await app.showControls(6);
      // Glow starts at zero, so the one drag rises to show the halo and settles
      // back on the working value.
      await app.sweepThrough("Glow", [0, 0.85, 0.05], 48, { hold: 8 });
      await d.hold(16);
    },
  },

  {
    id: "brightness",
    async run(app, d) {
      d.say("brightness");
      await app.showControls(6);
      await app.sweepThrough("Brightness", [1, 0, 0.5], 40, { hold: 8 });
      await app.revealResult(22);
    },
  },

  {
    id: "remove-stars",
    async run(app, d) {
      // The canvas has to be reachable, so on a phone the sheet comes down.
      await app.revealResult(4);

      // Picking out one star among a few thousand is the one moment in the
      // video that genuinely needs magnification, so the studio's own zoom goes
      // in here and stays in for the three star beats. The caption goes up
      // with the zoom: a separate "zoom" line was too brief to read.
      d.say("removeStars");
      // A gentler zoom than the studio allows: close enough to aim at one star,
      // wide enough that its neighbours keep their spikes in frame for contrast.
      const cluster = await app.findCluster(12, 240);
      await app.zoomAt(cluster, 6, 2);
      await d.hold(8);

      // The brightest stars in view, so each click takes away spikes nobody can
      // miss.
      removedStars = await app.findBrightestStars(3, { minSeparation: 120 });
      process.stdout.write(
        `  remove: ${removedStars.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ")}\n`,
      );
      for (const star of removedStars) {
        await app.tapAt(star, { travel: 8, settle: 14, focusRadius: 78 });
      }
      await d.hold(12);
    },
  },

  {
    id: "add-stars",
    async run(app, d) {
      d.say("addStars");
      // The same stars that just lost their spikes, clicked again: the big arms
      // coming back is unmistakable in a way a faint star's short ones are not.
      const restore = removedStars.length > 0
        ? removedStars.slice(0, 2)
        : await app.findStars(2, { unspiked: true, minSeparation: 120 });
      for (const star of restore) {
        await app.tapAt(star, { travel: 8, settle: 16, focusRadius: 78 });
      }
      await d.hold(14);
    },
  },

  {
    id: "tune-star",
    async run(app, d) {
      d.say("tuneStar");
      const candidates = await app.findStars(4);
      if (await app.selectStar(candidates.slice(0, 3))) {
        await app.sweepStar("Brightness", 1, 1.8, 30, { hold: 8 });
        await app.sweepStar("Length", 1, 2.1, 30, { hold: 10 });
        await app.tap(
          app.page.getByRole("button", { name: "Deselect star" }),
          { settle: 6 },
        );
      }

      // Back out to the whole frame before the video moves on. Wheeling out
      // along the same anchor restores the framing; the rail's Reset button
      // would do it in one click but also discard every slider value so far.
      await app.revealResult(4);
      await app.zoomAt(await app.canvasCentre(), -8, 2);
      await d.hold(8);
    },
  },

  {
    id: "rotate",
    async run(app, d) {
      d.say("rotate");
      await app.showControls(6);
      await app.sweep("Rotation", 0, 30, 36, { hold: 8 });
      await d.hold(14);
    },
  },

  {
    id: "arms",
    async run(app, d) {
      // Both counts, so the switch reads as a choice rather than a one-way
      // upgrade.
      d.say("arms6");
      await app.showControls(6);
      await app.chooseArms(6, 8);
      await d.hold(28);

      d.say("arms4");
      await app.chooseArms(4, 8);
      await app.revealResult(24);
    },
  },

  {
    id: "compare-spikes",
    async run(app, d) {
      await app.revealResult(4);
      d.say("compareSpikes");
      await app.wipeCompareTo(88, 40);
      await d.hold(14);
      await app.wipeCompareTo(3, 18);
      await d.hold(6);
    },
  },

  {
    id: "presets",
    async run(app, d) {
      d.say("jwst");
      await app.showControls(6);
      await app.choosePreset("JWST", 10);
      await d.hold(30);

      d.say("subtle");
      await app.choosePreset("Subtle", 10);
      await d.hold(30);
    },
  },

  {
    id: "export-menu",
    async run(app, d) {
      // Shows the choices without committing to one: the menu opens, holds long
      // enough to read, and closes again from the same arrow.
      d.say("exportOptions");
      await app.showControls(6);
      await app.openExportMenu(10);
      await d.hold(45);
      await app.closeExportMenu(6);
    },
  },

  {
    id: "mw-empty",
    async run(app, d) {
      await app.revealResult(4);
      d.say("wideField");
      await app.tap(app.tool("Remove image"), { settle: 16 });

      await dropImage(app, d, MILKY_WAY);
      await holdUntilDetected(app, d, 90);
      await d.hold(20);
    },
  },

  {
    id: "diffusion",
    async run(app, d) {
      d.say("diffusion");
      await app.showControls(6);
      await app.choosePreset("Diffusion", 10);
      await d.hold(22);

      // Every control is run down to nothing and then up to its final value,
      // so each effect is seen arriving rather than simply being there.
      d.say("mwMagnitude");
      const mw = await app.starCountPosition(MW_TARGET_STAR_COUNT);
      const mwTotal = mw.total;
      await app.sweepThrough(
        "Star magnitude",
        [await app.controlValue("Star magnitude"), 0, mw.value],
        48,
        { hold: 8 },
      );
      process.stdout.write(
        `  milky way: ${MW_TARGET_STAR_COUNT} of ${mwTotal} detected\n`,
      );
      await d.hold(14);

      d.say("mwGlow");
      await app.sweepThrough("Glow", [await app.controlValue("Glow"), 0, 0.7], 48, {
        hold: 8,
      });
      await d.hold(14);

      d.say("mwMist");
      await app.sweep("Mist", 0, 0.2, 32, { hold: 8 });
      await d.hold(14);

      d.say("mwBrightness");
      await app.sweepThrough("Brightness", [1, 0, 1.2], 44, { hold: 8 });
      await app.revealResult(26);
    },
  },

  {
    id: "compare",
    async run(app, d) {
      d.say("compare");
      await app.wipeCompareTo(88, 40);
      await d.hold(14);
      // Leave the divider off the frame so the export beat shows the result.
      await app.wipeCompareTo(3, 18);
    },
  },

  {
    // The Milky Way half ends on a real export, so the video shows the
    // studio's "Saved" confirmation for a full-resolution file.
    id: "export",
    async run(app, d) {
      d.say("exportShot");
      await app.showControls(6);
      await app.openExportMenu(10);
      await d.hold(30);
      await app.exportFromMenu(/Lossless/, d);
      await d.hold(30);
    },
  },
];
