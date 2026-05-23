import { Locator, Page, expect } from "@playwright/test";

/**
 * Bottom-nav labels available in mobile infographic mode. The labels
 * come from `MobileShellComponent.infographicItems` and are surfaced as
 * the bottom-nav tab `aria-label` attribute.
 */
export type MobileInfographicNavLabel =
  | "Info"
  | "Capture"
  | "Gear"
  | "Style";

/**
 * Bottom-nav labels available in mobile stellar mode. The labels come
 * from `MobileShellComponent.stellarItems`.
 */
export type MobileStellarNavLabel = "Filters" | "Style" | "Item";

/**
 * Sheet titles rendered in the expanded floating-sheet header — used as
 * a behavioural cue to assert which panel content is currently mounted
 * inside the sheet body.
 */
export type MobileSheetTitle =
  | "Object info"
  | "Capture"
  | "Equipment"
  | "Style"
  | "Annotation filters"
  | "Annotation style"
  | "Selected annotation";

/**
 * Page Object for the mobile astrogram shell (compact top-bar +
 * full-bleed preview + floating-sheet + bottom-nav). Sets the viewport
 * to 390×844 (iPhone 14) which matches the mobile artboard the
 * redesign was authored against. All locators are semantic — no CSS
 * selectors or XPath.
 */
export class AstrogramMobilePage {
  /** Stable container for the mobile shell — only mounts below the breakpoint. */
  private readonly mobileShellMount: Locator;
  /** Stable container for the card hero region in the preview. */
  private readonly cardHero: Locator;
  /** Floating sheet dialog — `role="dialog"` from the FloatingSheetComponent. */
  private readonly floatingSheet: Locator;
  /** "Collapse panel" close button rendered in the expanded sheet header. */
  private readonly closeSheetButton: Locator;

  constructor(private readonly page: Page) {
    this.mobileShellMount = this.page.getByTestId("mobile-shell");
    this.cardHero = this.page.getByTestId("card-hero");
    this.floatingSheet = this.page.getByRole("dialog");
    this.closeSheetButton = this.page.getByRole("button", {
      name: "Collapse panel",
    });
  }

  /**
   * Sets the mobile viewport (390×844, iPhone 14) and navigates to the
   * astrogram tool. Waits for the mobile shell sentinel to confirm the
   * shell mounted before returning.
   */
  async navigate(): Promise<void> {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto("http://localhost:4201/astrogram/");
    await expect(this.mobileShellMount).toBeVisible();
  }

  /** Switches the top-bar segmented tabs to Infographic mode. */
  async switchToInfographicMode(): Promise<void> {
    // The compact top-bar uses the shorter "Info" label, while the
    // bottom-nav also has an "Info" tab — disambiguate via .first()
    // since the top-bar appears first in DOM order.
    await this.page
      .getByRole("tab", { name: "Info", exact: true })
      .first()
      .click();
  }

  /** Switches the top-bar segmented tabs to Stellar Map mode. */
  async switchToStellarMode(): Promise<void> {
    await this.page
      .getByRole("tab", { name: "Stellar", exact: true })
      .first()
      .click();
  }

  /**
   * Taps a bottom-nav item by its accessible name. Disambiguates from
   * any same-named top-bar tab by selecting the last matching `role="tab"`
   * — the bottom-nav is mounted below the top-bar in DOM order.
   */
  async tapBottomNavItem(
    label: MobileInfographicNavLabel | MobileStellarNavLabel,
  ): Promise<void> {
    await this.page
      .getByRole("tab", { name: label, exact: true })
      .last()
      .click();
  }

  /**
   * Returns true when the floating sheet is in its expanded state. Uses
   * the `aria-expanded` attribute on the dialog as the source of truth
   * rather than reading CSS — this stays robust if the visual style
   * changes.
   *
   * Reads the attribute exactly once; tests that need to wait for an
   * expand/collapse transition should use `expectSheetExpanded()` /
   * `expectSheetCollapsed()` instead, which retry with Playwright's
   * built-in polling.
   */
  async isFloatingSheetExpanded(): Promise<boolean> {
    const expanded = await this.floatingSheet.getAttribute("aria-expanded");
    return expanded === "true";
  }

  /** Retries until `aria-expanded === "true"` or the assertion times out. */
  async expectSheetExpanded(): Promise<void> {
    await expect(this.floatingSheet).toHaveAttribute("aria-expanded", "true");
  }

  /** Retries until `aria-expanded === "false"` or the assertion times out. */
  async expectSheetCollapsed(): Promise<void> {
    await expect(this.floatingSheet).toHaveAttribute("aria-expanded", "false");
  }

  /**
   * Collapses the sheet by tapping the "Collapse panel" close button.
   * No-op safe: the close button only exists while expanded.
   */
  async collapseFloatingSheet(): Promise<void> {
    await this.closeSheetButton.click();
  }

  /**
   * Returns true when the card hero is rendered with non-zero
   * dimensions. The mobile preview-area is itself scrollable
   * (`overflow-y: auto` in `mobile-shell.component.css`), so the hero
   * being reachable is the user-facing contract — not whether the
   * floating sheet visually overlaps it in the initial paint.
   */
  async isCardPreviewVisible(): Promise<boolean> {
    const heroBox = await this.cardHero.boundingBox();
    return heroBox !== null && heroBox.height > 0 && heroBox.width > 0;
  }

  /**
   * Asserts that the expanded sheet currently shows the panel for the
   * given section name. The dialog `aria-label` mirrors the section
   * title set by `MobileShellComponent.sheetTitle`.
   */
  async expectSheetTitle(title: MobileSheetTitle): Promise<void> {
    await expect(this.floatingSheet).toHaveAttribute("aria-label", title);
  }

  /** Returns the mobile shell sentinel locator for visibility assertions. */
  getMobileShellMount(): Locator {
    return this.mobileShellMount;
  }

  /** Returns the desktop shell sentinel locator (for the not-mounted assertion). */
  getDesktopShellMount(): Locator {
    return this.page.getByTestId("desktop-shell");
  }

  /** Returns the floating sheet dialog locator. */
  getFloatingSheet(): Locator {
    return this.floatingSheet;
  }

  /** Returns the page handle for tests that need raw waits or screenshots. */
  getPage(): Page {
    return this.page;
  }
}
