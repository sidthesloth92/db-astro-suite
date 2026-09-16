import type { Locator, Page } from "@playwright/test";
import type { AstroSpikeDemoPage } from "../pages/astrospike-demo.page";
import type { DemoShell } from "./shell";

/** Clearance kept below a tap target when the sheet is down. */
const BOTTOM_MARGIN_PX = 90;

/**
 * The phone layout: a full-bleed stage with the controls in a floating sheet
 * that claims the bottom 62% of the screen when it is up.
 *
 * Because the sheet covers most of the picture, every result in this shell has
 * to be judged with it down — which is exactly how the studio is used on a
 * phone, and the only way a change to the image gets the whole frame.
 */
export class MobileShell implements DemoShell {
  readonly id = "mobile" as const;

  /** Taps the floating action button, if the sheet is not already up. */
  async showControls(app: AstroSpikeDemoPage, settle: number): Promise<void> {
    const fab = app.page.locator(".as-mobile-fab");
    if ((await fab.count()) === 0) {
      return;
    }
    await app.tap(fab, { settle });
  }

  /** Collapses the sheet so the picture has the frame, then holds. */
  async revealResult(app: AstroSpikeDemoPage, frames: number): Promise<void> {
    const close = app.page
      .locator("dba-ui-floating-sheet.as-mobile-sheet")
      .getByRole("button", { name: "Collapse panel" });
    if ((await close.count()) > 0) {
      await app.tap(close, { settle: 4 });
    }
    await app.director.hold(frames);
  }

  /** The sheet-hosted bar — the stage-hosted one is `display: none` here. */
  starPanel(page: Page): Locator {
    return page.locator("dba-as-star-controls.in-sheet .star-bar").first();
  }

  /**
   * Keeps taps above the sheet while it is up, and off the very bottom of the
   * screen when it is down.
   */
  async canvasMaxY(page: Page): Promise<number> {
    const sheet = page.locator("dba-ui-floating-sheet.as-mobile-sheet .sheet.is-expanded");
    if ((await sheet.count()) > 0) {
      const box = await sheet.boundingBox();
      if (box !== null) {
        return box.y - 16;
      }
    }
    const viewport = page.viewportSize();
    return (viewport?.height ?? 768) - BOTTOM_MARGIN_PX;
  }
}
