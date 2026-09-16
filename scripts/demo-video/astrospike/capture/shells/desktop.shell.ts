import type { Locator, Page } from "@playwright/test";
import type { AstroSpikeDemoPage } from "../pages/astrospike-demo.page";
import type { DemoShell } from "./shell";

/** Height reserved at the bottom of the stage for the floating star bar. */
const STAR_BAR_RESERVE_PX = 120;

/**
 * The two-pane desktop layout: stage on the left, a fixed 352px controls pane
 * on the right.
 *
 * Almost every layout verb is a no-op here, because the picture and the
 * controls are on screen together at all times — which is the desktop cut's
 * whole advantage over the vertical one. The exception is the per-star panel,
 * which on desktop floats over the bottom of the stage rather than living in
 * the pane.
 */
export class DesktopShell implements DemoShell {
  readonly id = "desktop" as const;

  /** Nothing to open: the pane is always beside the stage. */
  async showControls(): Promise<void> {
    // Intentionally empty.
  }

  /** Nothing covers the picture, so this is just a hold. */
  async revealResult(app: AstroSpikeDemoPage, frames: number): Promise<void> {
    await app.director.hold(frames);
  }

  /** The stage-hosted bar — never the `.in-sheet` variant. */
  starPanel(page: Page): Locator {
    return page.locator("dba-as-star-controls:not(.in-sheet) .star-bar").first();
  }

  /**
   * Keeps taps above the floating star bar, which sits 12px off the stage's
   * bottom edge and is roughly 90px tall.
   */
  async canvasMaxY(page: Page): Promise<number> {
    const stage = page.locator(".stage").first();
    const box = await stage.boundingBox();
    if (box === null) {
      return Number.POSITIVE_INFINITY;
    }
    return box.y + box.height - STAR_BAR_RESERVE_PX;
  }
}
