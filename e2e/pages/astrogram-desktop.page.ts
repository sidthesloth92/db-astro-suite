import { Download, Locator, Page, expect } from "@playwright/test";

/**
 * Inspector rail section IDs available on the desktop shell. The set varies
 * by active mode — infographic surfaces Layout / Object info / Capture /
 * Equipment / Export; stellar surfaces Annotation filters / Annotation
 * style / Selected Target / Export.
 */
export type DesktopInspectorSection =
  | "Layout"
  | "Object info"
  | "Capture"
  | "Equipment"
  | "Export"
  | "Annotation filters"
  | "Annotation style"
  | "Selected Target";

/** Export-format radio identifiers surfaced by the Export panel. */
export type ExportFormat = "png" | "jpeg" | "webp";

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
      .getByRole("tab", { name: /Infographic/i })
      .first()
      .click();
  }

  /** Switches the top-bar tabs to Stellar Map mode. */
  async switchToStellarMode(): Promise<void> {
    await this.page
      .getByRole("tab", { name: /Stellar/i })
      .first()
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

  /** Opens the Equipment panel from the rail. */
  async openEquipmentPanel(): Promise<void> {
    await this.openPanel("Equipment");
  }

  /** Opens the Layout panel from the rail. */
  async openLayoutPanel(): Promise<void> {
    await this.openPanel("Layout");
  }

  /** Opens the Export panel from the rail. */
  async openExportPanel(): Promise<void> {
    await this.openPanel("Export");
  }

  /** Opens the Capture panel from the rail. */
  async openCapturePanel(): Promise<void> {
    await this.openPanel("Capture");
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
   * Sets the seconds-per-frame value for the named filter row. Writes
   * directly to the numeric input identified by its
   * `<filter> seconds per frame` aria-label and fires `input` so the
   * signal updates.
   */
  async setSecondsPerFrame(
    filterName: CaptureFilterName | "Custom",
    seconds: number,
  ): Promise<void> {
    const input = this.page.getByLabel(`${filterName} seconds per frame`, {
      exact: true,
    });
    await input.fill(String(seconds));
    await input.blur();
  }

  /**
   * Opens the Layout panel and writes the given hex into the primary
   * Accent swatch's hidden `<input type="color">`. Dispatches input +
   * change because color inputs ignore `.fill()`.
   */
  async setAccentColor(hex: string): Promise<void> {
    await this.openPanel("Layout");
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

  /** Sets the primary Accent colour on the open Layout panel (does not re-open). */
  async setPrimaryAccent(hex: string): Promise<void> {
    const accentInput = this.page.getByLabel("Accent colour", { exact: true });
    await accentInput.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, hex);
  }

  /**
   * Writes a hex value into the "Secondary accent colour" swatch. This
   * accent drives the OIII progress-ring stroke and secondary pill
   * tones on the card.
   */
  async setSecondaryAccent(hex: string): Promise<void> {
    const accentInput = this.page.getByLabel("Secondary accent colour", {
      exact: true,
    });
    await accentInput.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, hex);
  }

  /**
   * Saves the current equipment + software list as a preset under the
   * given label. Sequence: click `Add new` → fill the inline draft input
   * → click `Save`. Caller must already be on the Equipment panel.
   */
  async saveEquipmentPreset(label: string): Promise<void> {
    await this.page.getByRole("button", { name: "Add new" }).click();
    await this.page.getByPlaceholder("Enter preset name...").fill(label);
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
  }

  /**
   * Activates an existing preset by its label. The load button's
   * accessible name combines the preset name + its equipment note in
   * a single string (e.g. `"Test rig · Askar 103 APO · ZWO ASI2600"`),
   * so we match by substring rather than exact equality.
   */
  async applyEquipmentPreset(label: string): Promise<void> {
    await this.page
      .getByRole("button", { name: new RegExp(escapeRegex(label)) })
      .first()
      .click();
  }

  /**
   * Returns the labels of all saved presets — derived from the per-row
   * "Delete preset <name>" button accessible names so the list is
   * read straight from the rendered DOM.
   */
  async getEquipmentPresetLabels(): Promise<string[]> {
    const buttons = this.page.getByRole("button", {
      name: /^Delete preset /,
    });
    const labels: string[] = [];
    const count = await buttons.count();
    for (let i = 0; i < count; i += 1) {
      const name = await buttons.nth(i).getAttribute("aria-label");
      if (name) {
        labels.push(name.replace(/^Delete preset /, ""));
      }
    }
    return labels;
  }

  /**
   * Picks an export format radio inside the Export panel. The radio
   * row's accessible name is the visible label ("PNG" / "JPEG" /
   * "WebP"), case-mapped from the lower-case format id.
   */
  async setExportFormat(format: ExportFormat): Promise<void> {
    const label =
      format === "png" ? "PNG" : format === "jpeg" ? "JPEG" : "WebP";
    // The radio row's accessible name combines the visible format label
    // with its descriptive note (e.g. "PNG Best quality · larger file"),
    // so substring matching is required.
    await this.page
      .getByRole("button", { name: new RegExp(`^${label}\\b`) })
      .click();
  }

  /**
   * Clicks the in-panel Export CTA (not the top-bar Export rail item)
   * and resolves with the resulting Download event. The CTA's button
   * name is "Export"; we scope by DOM order (last match) so this does
   * not collide with the rail item that also reads "Export".
   *
   * Sequencing matters on slow CI runners:
   *   - Gate on the "Output format" header so we know the Export panel
   *     has mounted (otherwise `.last()` may resolve to the rail item).
   *   - Wait for the CTA to be enabled (`!canExport()` may be true
   *     briefly while the preview registers its exporter).
   *   - Use a 60s download wait — the first export pipeline invocation
   *     dynamically imports `modern-screenshot` and waits for fonts,
   *     which can exceed the 30s default in CI cold-cache.
   */
  async triggerExport(): Promise<Download> {
    await this.page
      .getByText("Output format")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    const cta = this.getExportPanelCta();
    await expect(cta).toBeEnabled({ timeout: 10_000 });
    const downloadPromise = this.page.waitForEvent("download", { timeout: 60_000 });
    await cta.click();
    return downloadPromise;
  }

  /** Returns the in-panel Export CTA — useful for disabled-state assertions. */
  getExportPanelCta(): Locator {
    return this.page
      .getByRole("button", { name: "Export", exact: true })
      .last();
  }

  /** True when the in-panel Export CTA is enabled. */
  async isExportPanelCtaEnabled(): Promise<boolean> {
    return this.getExportPanelCta().isEnabled();
  }

  /**
   * Clicks the top-bar Export CTA and resolves with the resulting
   * Download event. The export pipeline triggers a browser download
   * (PNG/JPEG/WebP).
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
    return this.cardHero.evaluate((el) => getComputedStyle(el).borderColor);
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

/** Escapes regex metacharacters so `label` text is matched literally. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
