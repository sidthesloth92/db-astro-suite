import type { Locator, Page } from "@playwright/test";
import type { AstroSpikeDemoPage } from "../pages/astrospike-demo.page";

/** Which layout the studio is rendering. */
export type ShellId = "mobile" | "desktop";

/**
 * The parts of a beat that depend on which layout AstroSpike is rendering.
 *
 * Above 1080 CSS px the studio puts a fixed 352px controls pane beside the
 * stage; below it, the controls live in a sheet that covers the bottom 62% of
 * the screen and the picture is only visible once that sheet is down. Those are
 * different enough that the same beat has to mean different things — "let the
 * viewer see the result" is a sheet collapse on a phone and a no-op on a
 * desktop, where nothing was covering the picture in the first place.
 *
 * Beats therefore call intent-level verbs and a shell decides the mechanism, so
 * the timeline is written once and captured twice.
 */
export interface DemoShell {
  /** Which layout this is. */
  readonly id: ShellId;

  /**
   * Put the controls within reach of the cursor before a slider is driven.
   * Mobile raises the sheet; desktop does nothing.
   */
  showControls(app: AstroSpikeDemoPage, settle: number): Promise<void>;

  /**
   * Give the picture the frame to itself and hold there.
   * Mobile collapses the sheet first; desktop simply holds.
   */
  revealResult(app: AstroSpikeDemoPage, frames: number): Promise<void>;

  /**
   * The per-star panel that is actually visible.
   *
   * Below 1080px two `dba-as-star-controls` exist in the DOM at once — the
   * stage-hosted one is `display: none` — so an unscoped locator picks the
   * wrong one roughly half the time.
   */
  starPanel(page: Page): Locator;

  /**
   * Lowest y a canvas tap may target, in viewport CSS pixels.
   *
   * Keeps star clicks clear of whatever occupies the bottom of the stage: the
   * controls sheet on mobile, the floating per-star bar on desktop.
   */
  canvasMaxY(page: Page): Promise<number>;
}
