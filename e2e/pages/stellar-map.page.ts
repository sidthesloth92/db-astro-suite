import { Locator, Page } from "@playwright/test";

/**
 * Page Object for the Stellar Map mode of astrogram (preview, annotation
 * layer, and stellar-mode inspector panels). Selectors are semantic with
 * narrow CSS fallbacks called out inline where the component has no
 * accessible affordance yet.
 */
export class StellarMapPage {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto("http://localhost:4201/astrogram/");
    // Wait for either shell sentinel — the redesign mounts a desktop or
    // mobile shell based on viewport, and either confirms the app
    // bootstrapped before mode-tab interaction.
    await this.page
      .getByTestId(/^(desktop|mobile)-shell$/)
      .first()
      .waitFor({ state: "visible" });
  }

  async switchToStellarMapMode() {
    // The mode switcher was converted from buttons to role="tab" in the
    // Direction B redesign — `.first()` selects the desktop tab when
    // both desktop and mobile shells are present.
    await this.page
      .getByRole("tab", { name: /Stellar Map/i })
      .first()
      .click();
  }

  async switchToInfographicMode() {
    await this.page
      .getByRole("tab", { name: /Infographic/i })
      .first()
      .click();
  }

  getInfographicModeButton(): Locator {
    return this.page.getByRole("tab", { name: /Infographic/i }).first();
  }

  getStellarMapModeButton(): Locator {
    return this.page.getByRole("tab", { name: /Stellar Map/i }).first();
  }

  /** Visible in the preview panel when no image has been uploaded. */
  getUploadTargetHeading(): Locator {
    return this.page.getByText("Upload Target");
  }

  /** The ASTROSOLVE plate-solve trigger button in the config panel. */
  getAstrosolveButton(): Locator {
    return this.page.getByRole("button", { name: /ASTROSOLVE/i });
  }

  /**
   * Uploads an image via the user-facing upload card. Routes through
   * Playwright's filechooser pattern (click the upload card → resolve
   * the OS-level file dialog) — this is more reliable than calling
   * `setInputFiles` directly on the hidden `<input type="file">` because
   * the latter intermittently fails to trigger the Angular `(change)`
   * handler under parallel-worker load. Falls back to the direct input
   * path when the upload card is not present (e.g. an image is already
   * loaded).
   */
  async uploadImage(absolutePath: string) {
    const uploadCard = this.page.getByRole("button", { name: /Upload Target/ });
    if ((await uploadCard.count()) > 0 && (await uploadCard.first().isVisible())) {
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent("filechooser"),
        uploadCard.first().click(),
      ]);
      await fileChooser.setFiles(absolutePath);
      return;
    }
    const fileInput = this.page
      .locator('input[type="file"][accept="image/*"]')
      .first();
    await fileInput.setInputFiles(absolutePath);
  }

  /**
   * The "+" add annotation button visible after image upload.
   * The button has no visible text label — it is SVG-only and exposes its
   * accessible name through the `title` attribute ("Add annotation").
   */
  getAddAnnotationButton(): Locator {
    return this.page.getByRole("button", { name: "Add annotation" });
  }

  /**
   * All rendered annotation marker circles inside the annotations layer.
   * No semantic locator is available: these are bare <div> elements that carry
   * no ARIA role, no visible text, and no `data-testid`. The CSS class
   * `.annotation-marker` is the stable identifier provided by the component
   * author and is the only reliable targeting strategy.
   */
  getAnnotationMarkers(): Locator {
    return this.page.locator(".annotation-marker");
  }

  /** The first annotation marker in the preview. */
  getFirstAnnotationMarker(): Locator {
    return this.getAnnotationMarkers().first();
  }

  /**
   * Adds a custom annotation by clicking the "+" button and waits for the
   * first marker to become visible in the preview.
   */
  async addCustomAnnotation(): Promise<void> {
    await this.getAddAnnotationButton().click();
    await this.getFirstAnnotationMarker().waitFor({ state: "visible" });
  }

  /**
   * Drags the given annotation marker by `dx` pixels on X and `dy` pixels on Y.
   * Uses the low-level `page.mouse` API to control the delta precisely — this
   * allows the component's 3 px threshold to distinguish a drag from a click.
   */
  async dragAnnotationBy(
    marker: Locator,
    dx: number,
    dy: number,
  ): Promise<void> {
    await marker.waitFor({ state: "visible" });
    const box = await marker.boundingBox();
    if (!box) {
      throw new Error("Annotation marker has no bounding box — cannot drag");
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await this.page.mouse.up();
    // Allow the 0.25s CSS position transition on .annotation-marker to settle
    // before the caller reads boundingBox().
    await this.page.waitForTimeout(300);
  }

  // ── Stellar-mode inspector panels ──────────────────────────────────

  /**
   * Opens the global "Annotation style" inspector panel from the stellar
   * rail. Panel header reads `Circle` / `Label`; this method drives the
   * rail item by its accessible name.
   */
  async openAnnotationStylePanel(): Promise<void> {
    await this.page
      .getByRole("navigation")
      .getByRole("button", { name: "Annotation style", exact: true })
      .click();
  }

  /**
   * Opens the per-marker "Selected Target" panel from the stellar rail.
   * The rail item only appears once an annotation is selected.
   */
  async openSelectedAnnotationPanel(): Promise<void> {
    await this.page
      .getByRole("navigation")
      .getByRole("button", { name: "Selected Target", exact: true })
      .click();
  }

  /**
   * Clicks the annotation marker at the given index. Used as the
   * behavioural trigger to surface the "Selected Target" rail item.
   */
  async selectAnnotationMarker(index: number): Promise<void> {
    await this.getAnnotationMarkers().nth(index).click();
  }

  /**
   * Writes a new label into the selected-annotation `Label` input. The
   * input exposes `aria-label="Annotation label"` from
   * `annotation-selected-panel.component.html`.
   */
  async setSelectedAnnotationLabel(text: string): Promise<void> {
    const input = this.page.getByLabel("Annotation label", { exact: true });
    await input.fill(text);
  }

  /**
   * Clicks the per-marker `Revert` button in the Selected Target panel.
   * This restores the original label plus the global style overrides.
   */
  async revertSelectedAnnotationLabel(): Promise<void> {
    await this.page.getByRole("button", { name: "Revert", exact: true }).click();
  }

  /**
   * Returns the locator for the selected-annotation label input — used
   * by tests that need to assert the current value after a revert.
   */
  getSelectedAnnotationLabelInput(): Locator {
    return this.page.getByLabel("Annotation label", { exact: true });
  }

  /**
   * Toggles the named stellar capture/annotation filter switch. The
   * switch accessible name on each row is `<filter name> filter`.
   */
  async toggleStellarFilter(filterName: string): Promise<void> {
    await this.page
      .getByRole("switch", { name: `${filterName} filter` })
      .click();
  }

  /**
   * Sets a custom seconds-per-frame for the named filter row in the
   * Capture panel. The numeric input is labelled
   * `<filter name> seconds per frame`.
   */
  async setCustomSecondsPerFrame(
    filterName: string,
    seconds: number,
  ): Promise<void> {
    const input = this.page.getByLabel(`${filterName} seconds per frame`, {
      exact: true,
    });
    await input.fill(String(seconds));
    await input.blur();
  }

  /**
   * Returns the "Total Integration: <value>" line text from the caption
   * region — used to assert that capture-panel changes propagate to the
   * card document.
   */
  async getIntegrationTotalText(): Promise<string> {
    return (
      await this.page.getByText(/Total Integration:/i).first().innerText()
    ).trim();
  }
}
