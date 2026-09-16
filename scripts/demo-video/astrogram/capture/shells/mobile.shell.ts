import type { Locator, Page } from "@playwright/test";
import type { AstrogramDemoPage } from "../pages/astrogram-demo.page";
import type { DemoShell, PanelId } from "./shell";

/** The bottom tab bar's labels, per panel. */
const TAB_LABELS: Record<PanelId, string> = {
  layout: "Layout",
  object: "Info",
  capture: "Capture",
  equipment: "Gear",
  export: "Export",
  filters: "Filters",
  style: "Style",
  selected: "Selected Target",
};

/**
 * The phone layout: the card fills the screen and every panel lives in a
 * floating sheet raised from the bottom tab bar, covering about 70% of it.
 *
 * Tapping the tab of the section that is already selected toggles the sheet
 * rather than keeping it open, so every verb here checks the sheet's state
 * before it taps anything.
 */
export class MobileShell implements DemoShell {
  readonly id = "mobile" as const;

  /** Raises the sheet on the requested panel, tapping its tab only if needed. */
  async openPanel(app: AstrogramDemoPage, panel: PanelId, settle: number): Promise<void> {
    if (await this.isOpenOn(app.page, panel)) {
      return;
    }
    await app.pointer.tap(this.tab(app.page, panel), { settle });
    await app.page
      .locator("dba-ui-floating-sheet .sheet.is-expanded")
      .waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Raises the sheet on a panel with a plain click. */
  async openPanelSilently(page: Page, panel: PanelId): Promise<void> {
    if (!(await this.isOpenOn(page, panel))) {
      await this.tab(page, panel).click();
    }
  }

  /**
   * Lowers the sheet so the card has the screen, then holds.
   *
   * The sheet's own close button is the natural gesture, but in Stellar map
   * mode the map's zoom controls are painted over it, so when it is covered
   * the active bottom tab — which toggles the sheet — is tapped instead.
   */
  async revealResult(app: AstrogramDemoPage, frames: number): Promise<void> {
    if (await this.isExpanded(app.page)) {
      const close = this.collapseButton(app.page);
      const target = (await app.pointer.isHittable(close))
        ? close
        : app.page.locator("dba-ui-bottom-nav").getByRole("tab", { selected: true });
      await app.pointer.tap(target, { settle: 4, focus: false });
      await app.page
        .locator("dba-ui-floating-sheet .sheet.is-expanded")
        .waitFor({ state: "detached", timeout: 5_000 });
    }
    await app.director.hold(frames);
  }

  /** Lowers the sheet with a plain click. */
  async closePanelSilently(page: Page): Promise<void> {
    if (await this.isExpanded(page)) {
      await this.collapseButton(page).click();
    }
  }

  /** The sheet's content area. */
  panelRoot(page: Page): Locator {
    return page.locator("dba-ui-floating-sheet .content");
  }

  /** The area under the mode toggle that scrolls the card and caption. */
  previewScroller(page: Page): Locator {
    return page.locator(".preview-area");
  }

  private tab(page: Page, panel: PanelId): Locator {
    return page.locator("dba-ui-bottom-nav").getByRole("tab", { name: TAB_LABELS[panel], exact: true });
  }

  private collapseButton(page: Page): Locator {
    return page.locator("dba-ui-floating-sheet").getByRole("button", { name: "Collapse panel" });
  }

  private async isExpanded(page: Page): Promise<boolean> {
    return (await page.locator("dba-ui-floating-sheet .sheet.is-expanded").count()) > 0;
  }

  private async isOpenOn(page: Page, panel: PanelId): Promise<boolean> {
    const selected = (await this.tab(page, panel).getAttribute("aria-selected")) === "true";
    return selected && (await this.isExpanded(page));
  }
}
