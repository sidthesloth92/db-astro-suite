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
}
