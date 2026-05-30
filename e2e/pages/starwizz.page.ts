import { Locator, Page, expect } from "@playwright/test";

/**
 * Control-panel slider labels rendered by the redesigned starwizz
 * control-panel. Values map 1:1 to the `label` property in
 * `simulation.constant.ts → CONTROLS`. Use these for `setControlValue()`
 * so tests stay decoupled from the underlying control key string.
 */
export type StarwizzControlLabel =
  | "Zoom Speed"
  | "Rotation Speed"
  | "Shooting Star Speed"
  | "Star Speed"
  | "Star Size Multiplier";

/**
 * Page Object for the starwizz simulator (control panel + canvas +
 * upload/clear overlays). The HUD overlay is hardcoded fake telemetry
 * in the current implementation and is asserted as a visibility-only
 * concern — no FOV / resolution readouts to drive.
 *
 * Locators are semantic; the lone CSS fallback (`canvas` element) is
 * documented inline because the WebGL canvas exposes no ARIA role.
 */
export class StarwizzPage {
  /** The hidden file input behind the upload overlay's `label`. */
  private readonly uploadInput: Locator;
  /** Section landmark for the control panel. */
  private readonly controlPanel: Locator;
  /** The WebGL canvas — masked in visual snapshots. */
  private readonly canvas: Locator;
  /** Upload overlay heading — present only when no image has been loaded. */
  private readonly uploadOverlayHeading: Locator;

  constructor(private readonly page: Page) {
    // The upload `<input type="file" id="imageUpload">` is hidden, so
    // role/label queries do not match it. The `id` attribute is stable
    // and the only semantic-equivalent handle available.
    this.uploadInput = this.page.locator("#imageUpload");
    this.controlPanel = this.page.getByRole("region", {
      name: "Starwizz simulation controls",
    });
    // The canvas element exposes no role; the bespoke CSS class
    // `.star-canvas` is the only stable handle the component author
    // provides.
    this.canvas = this.page.locator("canvas.star-canvas");
    this.uploadOverlayHeading = this.page.getByText("Upload Target");
  }

  /** Navigates to starwizz at its dev-server origin and waits for the control panel. */
  async navigate(): Promise<void> {
    await this.page.goto("http://localhost:4200/starwizz/");
    await expect(this.controlPanel).toBeVisible();
  }

  /**
   * Uploads the given image file into the simulator. The upload overlay
   * only mounts while no image is loaded — if the default image has
   * already auto-loaded we click Clear first so the overlay (and its
   * hidden input) renders.
   */
  async uploadImage(absolutePath: string): Promise<void> {
    if (await this.getClearButton().isVisible()) {
      await this.clearImage();
    }
    await this.uploadInput.waitFor({ state: "attached" });
    await this.uploadInput.setInputFiles(absolutePath);
  }

  /** Locator for the upload overlay heading — visible only before upload. */
  getUploadOverlayHeading(): Locator {
    return this.uploadOverlayHeading;
  }

  /** Locator for the WebGL canvas — used for mask regions in screenshots. */
  getCanvas(): Locator {
    return this.canvas;
  }

  /** Locator for the control panel `<section>`. */
  getControlPanel(): Locator {
    return this.controlPanel;
  }

  /**
   * Locator for the "Clear" button that returns the simulator to its
   * upload state. The button only exists when an image is loaded.
   */
  getClearButton(): Locator {
    return this.page.getByRole("button", { name: "Clear", exact: true });
  }

  /** Clicks the Clear button to remove the current image. */
  async clearImage(): Promise<void> {
    await this.getClearButton().click();
  }

  /**
   * Returns the slider input for the named control. The micro-slider
   * primitive does not emit an aria-label on its native range input
   * (BLOCKER for `getByRole("slider", { name })`), so we anchor the
   * lookup on the row text (the `<label>` rendered next to the
   * slider) and then descend to the sibling slider role.
   */
  private getControlSlider(label: StarwizzControlLabel): Locator {
    return this.controlPanel
      .locator(".slider-row")
      .filter({ hasText: label })
      .getByRole("slider");
  }

  /**
   * Drives the slider for the named control to the given numeric value.
   * The slider is a native `<input type="range">`; we set `.value`
   * directly + dispatch `input` so the simulation service signal
   * updates synchronously.
   */
  async setControlValue(
    label: StarwizzControlLabel,
    value: number,
  ): Promise<void> {
    const slider = this.getControlSlider(label);
    await slider.evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  /**
   * Reads the current numeric value of the named control's slider as a
   * string. The native `<input type="range">` exposes `value` as a
   * string; this is the most stable readout for sibling assertions.
   */
  async getControlReadout(label: StarwizzControlLabel): Promise<string> {
    const slider = this.getControlSlider(label);
    return slider.evaluate((el) => (el as HTMLInputElement).value);
  }
}
