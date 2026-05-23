import { Download, Locator, Page, expect } from "@playwright/test";

/**
 * Inspector rail section IDs available on the desktop shell. The set varies
 * by active mode — the infographic mode shows Object info / Capture /
 * Equipment / Style / Export, while the stellar mode shows Filters /
 * Annotation style / Selection.
 */
export type DesktopInspectorSection =
  | "Object info"
  | "Capture"
  | "Equipment"
  | "Style"
  | "Export"
  | "Annotation filters"
  | "Annotation style"
  | "Selected annotation";

/**
 * Default capture filter names seeded by `DEFAULT_FILTERS`. The switch
 * accessible name is rendered as `<name> filter`, e.g. `Ha filter`.
 */
export type CaptureFilterName = "L" | "Ha" | "OIII" | "SII" | "R" | "G" | "B";

/**
 * Page Object for the desktop astrogram shell (top-bar + inspector rail
 * + preview stage). Navigates to `/astrogram/` at a 1400×900 viewport,
 * which matches the design's desktop artboard. All locators are
 * semantic — no CSS selectors or XPath.
 */
export class AstrogramDesktopPage {
  /** Stable container for the desktop shell — mounted only above the mobile breakpoint. */
  private readonly desktopShellMount: Locator;
  /** Stable container for the card hero region in the preview. */
  private readonly cardHero: Locator;
  /** Top-bar Export CTA — accessible name is "Export". */
  private readonly exportButton: Locator;
  /** Caption "Copy caption" button — accessible name comes from the icon-button title attribute. */
  private readonly copyCaptionButton: Locator;

  constructor(private readonly page: Page) {
    this.desktopShellMount = this.page.getByTestId("desktop-shell");
    this.cardHero = this.page.getByTestId("card-hero");
    this.exportButton = this.page.getByRole("button", { name: "Export" });
    this.copyCaptionButton = this.page.getByRole("button", {
      name: "Copy caption",
    });
  }

  /**
   * Sets the desktop viewport and navigates to the astrogram tool. Waits
   * for the desktop shell sentinel to confirm the shell mounted before
   * returning control to the test.
   */
  async navigate(): Promise<void> {
    await this.page.setViewportSize({ width: 1400, height: 900 });
    await this.page.goto("http://localhost:4201/astrogram/");
    await expect(this.desktopShellMount).toBeVisible();
  }

  /** Switches the top-bar tabs to Infographic mode. */
  async switchToInfographicMode(): Promise<void> {
    await this.page
      .getByRole("tab", { name: "Infographic", exact: true })
      .click();
  }

  /** Switches the top-bar tabs to Stellar Map mode. */
  async switchToStellarMode(): Promise<void> {
    await this.page
      .getByRole("tab", { name: "Stellar Map", exact: true })
      .click();
  }

  /**
   * Clicks the inspector rail item with the given accessible name. The
   * rail items are `<button>` elements whose `aria-label` is the long-form
   * section name (e.g. "Object info" / "Annotation filters"). Scopes to
   * the rail `<nav>` so the locator does not collide with same-named
   * controls elsewhere on the page (e.g. the top-bar "Export" CTA).
   */
  async openPanel(section: DesktopInspectorSection): Promise<void> {
    await this.page
      .getByRole("navigation")
      .getByRole("button", { name: section, exact: true })
      .click();
  }

  /**
   * Opens the Object info panel and writes a new object name. Used to
   * verify that the card-hero preview re-renders with the new title.
   */
  async setObjectName(name: string): Promise<void> {
    await this.openPanel("Object info");
    await this.page.getByLabel("Object name").fill(name);
  }

  /**
   * Opens the Capture panel and toggles the row for the given filter
   * name. The switch accessible name is `<filter name> filter`
   * (e.g. "Ha filter") — emitted by the dba-ui-switch primitive.
   */
  async toggleFilter(filterName: CaptureFilterName): Promise<void> {
    await this.openPanel("Capture");
    await this.page
      .getByRole("switch", { name: `${filterName} filter` })
      .click();
  }

  /**
   * Opens the Style panel and writes the given hex into the native color
   * input backing the Accent swatch. Dispatches input + change events
   * because <input type="color"> does not respond to fill().
   */
  async setAccentColor(hex: string): Promise<void> {
    await this.openPanel("Style");
    // Both "Accent colour" and "Secondary accent colour" exist in the
    // panel — require an exact match to disambiguate.
    const accentInput = this.page.getByLabel("Accent colour", { exact: true });
    await accentInput.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, hex);
  }

  /**
   * Clicks the top-bar Export CTA and resolves with the resulting
   * Download event. The export pipeline triggers a browser download
   * (PNG/JPEG/SVG); callers can inspect the suggested filename or
   * stream to disk for snapshotting.
   */
  async exportCard(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent("download");
    await this.exportButton.click();
    return downloadPromise;
  }

  /**
   * Clicks the caption Copy button and returns the text the page wrote
   * to the clipboard. The caller must have granted `clipboard-read` and
   * `clipboard-write` permissions on the browser context.
   */
  async copyCaption(): Promise<string> {
    await this.copyCaptionButton.click();
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /**
   * Returns the `border-color` computed style of the card hero. Used to
   * assert that the accent colour propagated from the Style panel into
   * the live preview.
   */
  async getCardHeroBorderColor(): Promise<string> {
    return this.cardHero.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
  }

  /** Returns the visible text content of the card hero (title + meta). */
  async getCardHeroText(): Promise<string> {
    return (await this.cardHero.innerText()).trim();
  }

  /** Asserts the desktop shell sentinel is visible. */
  getDesktopShellMount(): Locator {
    return this.desktopShellMount;
  }

  /** Returns the card hero region for direct assertions in tests. */
  getCardHero(): Locator {
    return this.cardHero;
  }

  /**
   * Returns the live "Total Integration: <value>" line shown in the
   * caption section below the card preview. The caption-section
   * re-renders whenever filters toggle, so this is a stable behavioural
   * proxy for the data flow from Capture panel → card document → caption.
   */
  async getIntegrationTotalFromCard(): Promise<string> {
    const totalLine = this.page.getByText(/Total Integration:/i);
    return (await totalLine.first().innerText()).trim();
  }

  /**
   * Returns the upload card heading visible when no stellar background
   * has been picked yet. Used to confirm Stellar Map mode is rendering.
   */
  getStellarUploadHeading(): Locator {
    return this.page.getByText("Upload Target");
  }

  /** Returns the page handle for tests that need raw waits or screenshots. */
  getPage(): Page {
    return this.page;
  }
}
