import { HOME_RIG } from "./app.constants";
import type { CaptionId } from "../captions";
import type { Director } from "../../engine/capture/director";
import type { AstrogramDemoPage } from "./pages/astrogram-demo.page";

/**
 * One segment of the video: what happens on screen and which caption is up
 * while it does.
 *
 * Each beat becomes its own clip, so a single segment can be re-captured with
 * `DEMO_BEATS=<id>` without redoing the rest. Beats run in order against one
 * continuous session, though, so each one starts from where the last left the
 * app — capture a later beat on its own only if the state it expects is the
 * app's opening state, or capture from its predecessor onwards.
 */
export interface Beat {
  id: string;
  run(app: AstrogramDemoPage, d: Director<CaptionId>): Promise<void>;
}

/** Feature photo annotations the style beat prefers to pick up and move. */
const FEATURED_OBJECT = /Rosette|NGC 2237|NGC 2244|NGC 2246|NGC 2239/i;

/**
 * Every theme but the default, in the order the video runs through them —
 * social-first, then infographic, then celestial, ending on Eclipse for the
 * size beat that follows.
 *
 * The first is chosen with a visible tap on the dropdown; the rest simply
 * change, because a demo of 29 looks is about the looks, not about 29 trips
 * through a picker.
 */
const THEME_CYCLE = [
  "Split Stats",
  "Star Card",
  "Credits",
  "Credits Ivory",
  "Headline",
  "Film Edge",
  "Emission",
  "Atlas",
  "Daylight",
  "Aurora",
  "Spectrum",
  "Halo",
  "Blueprint",
  "Duotone Poster",
  "Flight Log",
  "Observatory",
  "Obsidian Glass",
  "Orrery",
  "Comet",
  "Ringed Planet",
  "Constellation",
  "System Line",
  "Star Trails",
  "Moon Phases",
  "Telrad",
  "Event Horizon",
  "Radiant",
  "Eclipse",
] as const;

/** Frames each look holds during the run-through. */
const THEME_HOLD = 12;

/** Sizes as the Layout panel's dropdown labels them. */
const SIZE = {
  portrait: "4:5 · Portrait · 1080×1350",
  story: "9:16 · Story · 1080×1920",
  landscape: "1.91:1 · Landscape · 1080×566",
} as const;

/**
 * The script, in playback order. Frame counts are at 30 fps; the timeline
 * this was written to is in the README.
 *
 * Where the two layouts need different amounts of footage, the beat branches on
 * the shell rather than splitting into two scripts: the phone sheet covers the
 * card, so every edit there has to lower it to show the result, and the
 * vertical cut trims its runs of themes and sizes to stay under 90 seconds.
 */
export const BEATS: Beat[] = [
  // ------------------------------------------------------------ infographics
  {
    id: "open",
    async run(app, d) {
      d.say("open");
      await d.hold(100);
    },
  },
  {
    id: "details",
    async run(app, d) {
      d.say("details");
      await app.openPanel("object");
      await app.typeName("Rosette Nebula", 14);
      await app.fetchWiki();
      await d.hold(24);
      await app.revealResult(app.shell.id === "mobile" ? 40 : 6);
    },
  },
  {
    id: "capture",
    async run(app, d) {
      d.say("integration");
      await app.openPanel("capture");
      // Luminance joins the three narrowband rows, then Ha gets more frames;
      // the card's rings and total follow both.
      await app.toggleFilter("L", 20);
      await app.setFrames("Ha", 90, 20);
      d.say("bortle");
      await app.pickBortle(4, 26);
      await app.revealResult(app.shell.id === "mobile" ? 44 : 14);
    },
  },
  {
    id: "rig",
    async run(app, d) {
      d.say("rig");
      await app.openPanel("equipment");
      await app.applyPreset(HOME_RIG, 30);
      await app.revealResult(app.shell.id === "mobile" ? 44 : 30);
    },
  },
  {
    id: "themes",
    async run(app, d) {
      d.say("themes");
      await app.openPanel("layout");
      const [first, ...rest] = THEME_CYCLE;
      await app.chooseTheme(first);
      await app.revealResult(app.shell.id === "mobile" ? 30 : 26);
      for (const theme of rest) {
        await app.chooseTheme(theme, { tap: false });
        await d.hold(THEME_HOLD);
      }
      await d.hold(18);
    },
  },
  {
    id: "sizes",
    async run(app, d) {
      d.say("sizes");
      if (app.shell.id === "mobile") {
        await app.openPanel("layout");
        await app.chooseSize(SIZE.story);
        await app.revealResult(40);
        await app.chooseSize(SIZE.landscape, { tap: false });
        await d.hold(48);
        return;
      }
      await app.chooseSize(SIZE.portrait);
      await d.hold(30);
      await app.chooseSize(SIZE.story);
      await d.hold(36);
      await app.chooseSize(SIZE.landscape);
      await d.hold(44);
    },
  },
  {
    id: "caption",
    async run(app, d) {
      d.say("caption");
      await app.copyCaption(20);
      // Run down through the generated post text so the exposure, integration
      // and software blocks are actually read, then back up for the next act.
      await app.scrollCaptionToEnd(36);
      await d.hold(20);
      await app.scrollPreviewToTop(14);
    },
  },

  // ------------------------------------------------------------- stellar map
  {
    id: "solve",
    async run(app, d) {
      d.say("solve");
      await app.switchMode("Stellar map", 10);
      await app.uploadTarget();
      await app.chooseFov("Medium", 6);
      const objects = await app.astrosolve(22);
      process.stdout.write(`  solve drew ${objects} objects\n`);
      d.say("identified");
      await d.hold(48);
    },
  },
  {
    id: "filter",
    async run(app, d) {
      d.say("filter");
      await app.openPanel("filters");
      // Named-only is on by default; turning it off lets the survey stars in,
      // and the magnitude sweep then reaches fainter and back.
      await app.toggleCheck("Named objects only", 24);
      const current = await app.maxMagnitude();
      // The real solve carries ~1,500 sources, most of them magnitude 10-11, so
      // the sweep stops at 12: far enough that the field visibly fills in,
      // short of the point where the labels become an unreadable mat.
      await app.sweepMagnitude([current, 12, 9], 60, 24);
      await app.revealResult(app.shell.id === "mobile" ? 40 : 12);
    },
  },
  {
    id: "style",
    async run(app, d) {
      d.say("style");
      await app.openPanel("style");
      await app.sweepColour(app.circleColourInput(), "#FFD166", 22);
      // Lower the sheet on a phone so the marker is reachable; a short hold on
      // desktop, where nothing covers the photo.
      await app.revealResult(8);
      // Selection is by ring or label, never the circle's centre — which is
      // where smaller objects nest — so the label is what gets tapped and
      // then dragged.
      const label = (await app.featuredAnnotation(FEATURED_OBJECT)).locator(".annotation-label");
      await app.pointer.tap(label, { settle: 8 });
      await app.pointer.dragBy(label, 36, -28, 18);
      await app.openPanel("selected");
      await app.renameSelected("The Rosette", 14);
      await app.revealResult(app.shell.id === "mobile" ? 36 : 14);
    },
  },
  {
    id: "export",
    async run(app, d) {
      d.say("export");
      await app.clearSelection();
      await app.openPanel("export");
      await app.chooseFormat("PNG", 8);
      await app.exportFromPanel();
      await app.revealResult(app.shell.id === "mobile" ? 30 : 24);
    },
  },
];
