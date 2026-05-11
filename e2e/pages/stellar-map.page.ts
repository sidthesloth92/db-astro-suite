import { Locator, Page } from "@playwright/test";

export class StellarMapPage {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto("http://localhost:4201/astrogram/");
    // Wait for the mode switcher to confirm the app has fully loaded
    await this.page
      .getByRole("button", { name: /Infographic/i })
      .waitFor({ state: "visible" });
  }

  async switchToStellarMapMode() {
    await this.page.getByRole("button", { name: /Stellar Map/i }).click();
  }

  async switchToInfographicMode() {
    await this.page.getByRole("button", { name: /Infographic/i }).click();
  }

  getInfographicModeButton(): Locator {
    return this.page.getByRole("button", { name: /Infographic/i });
  }

  getStellarMapModeButton(): Locator {
    return this.page.getByRole("button", { name: /Stellar Map/i });
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
   * Sets files on the hidden file input that backs the stellar map upload flow.
   * There is no semantic locator for <input type="file">; the attribute selector
   * is the only reliable way to target this element across both rendered instances.
   * The first match corresponds to the input inside <dba-ag-stellar-map-preview>.
   */
  async uploadImage(absolutePath: string) {
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
  }
}
