import type { Locator, Page } from "@playwright/test";
import type { AstrogramDemoPage } from "../pages/astrogram-demo.page";
import type { DemoShell, PanelId } from "./shell";

/** The icon rail's accessible names, per panel. */
const RAIL_LABELS: Record<PanelId, string> = {
  layout: "Layout",
  object: "Object info",
  capture: "Capture",
  equipment: "Equipment",
  export: "Export",
  filters: "Annotation filters",
  style: "Annotation style",
  selected: "Selected Target",
};

/**
 * The desktop layout: card on the left, icon rail and inspector on the right.
 *
 * The inspector is always open, so revealing a result is just a hold — the card
 * never left the frame while it was being edited, which is the desktop cut's
 * whole advantage over the vertical one.
 */
export class DesktopShell implements DemoShell {
  readonly id = "desktop" as const;

  /** Taps the rail button, unless that panel is already the open one. */
  async openPanel(app: AstrogramDemoPage, panel: PanelId, settle: number): Promise<void> {
    const button = this.railButton(app.page, panel);
    if ((await button.getAttribute("aria-pressed")) === "true") {
      return;
    }
    await app.pointer.tap(button, { settle });
  }

  /** Clicks the rail button with no cursor and no frames. */
  async openPanelSilently(page: Page, panel: PanelId): Promise<void> {
    const button = this.railButton(page, panel);
    if ((await button.getAttribute("aria-pressed")) !== "true") {
      await button.click();
    }
  }

  /** Nothing covers the card, so this is just a hold. */
  async revealResult(app: AstrogramDemoPage, frames: number): Promise<void> {
    await app.director.hold(frames);
  }

  /** Nothing to close. */
  async closePanelSilently(): Promise<void> {
    // Intentionally empty: the inspector is permanent on desktop.
  }

  /** The inspector's scrolling panel body. */
  panelRoot(page: Page): Locator {
    return page.locator("dba-ag-inspector-panel-host .panel");
  }

  /** The card column, which scrolls down to the caption preview. */
  previewScroller(page: Page): Locator {
    return page.locator(".preview-col");
  }

  private railButton(page: Page, panel: PanelId): Locator {
    return page
      .locator("dba-ag-inspector-panel-host dba-ui-icon-rail-item")
      .getByRole("button", { name: RAIL_LABELS[panel], exact: true });
  }
}
