import { Locator, Page, expect } from "@playwright/test";

/**
 * Slider labels rendered by the AstroSpike controls pane. Values map 1:1 to the
 * `label` property in `controls.constants.ts → CONTROLS`, so tests stay
 * decoupled from the underlying control key strings.
 */
export type AstroSpikeControlLabel =
  | "Stars"
  | "Length"
  | "Brightness"
  | "Rotation";

/** Spike preset card names, matching `spike-presets.constants.ts`. */
export type AstroSpikePresetName = "Subtle" | "Classic" | "JWST";

/**
 * Page Object for AstroSpike — the client-side diffraction-spike studio
 * (dropzone, canvas stage, controls pane, export).
 *
 * Locators are semantic throughout. The two CSS fallbacks (the canvases and the
 * star-count pill) are documented inline: canvases expose no ARIA role, and the
 * pill is a presentational badge with no landmark of its own.
 */
export class AstroSpikePage {
  /** Section landmark for the controls pane. */
  private readonly controlPanel: Locator;
  /** Hidden file input behind the dropzone's "Select image" button. */
  private readonly fileInput: Locator;
  /** Dropzone headline — present only while no image is loaded. */
  private readonly dropzoneHeading: Locator;
  /** Privacy reassurance line inside the dropzone. */
  private readonly privacyNote: Locator;
  /** Preset card group. */
  private readonly presetGroup: Locator;
  /** Spike-arm count toggle (4 / 6). */
  private readonly armsTabs: Locator;

  constructor(private readonly page: Page) {
    this.controlPanel = this.page.getByRole("region", {
      name: "AstroSpike controls",
    });
    this.fileInput = this.page.getByTestId("file-input");
    this.dropzoneHeading = this.page.getByText("Drop your astrophoto here");
    this.privacyNote = this.page.getByText(
      "your image never leaves your browser",
    );
    this.presetGroup = this.page.getByRole("radiogroup", {
      name: "Spike preset",
    });
    this.armsTabs = this.page.getByRole("tablist");
  }

  /** Navigates to AstroSpike and waits for the controls pane to render. */
  async navigate(): Promise<void> {
    await this.page.goto("http://localhost:4202/astrospike/");
    await expect(this.controlPanel).toBeVisible();
  }

  /** Locator for the dropzone headline — visible only before an image loads. */
  getDropzoneHeading(): Locator {
    return this.dropzoneHeading;
  }

  /** Locator for the "never leaves your browser" privacy line. */
  getPrivacyNote(): Locator {
    return this.privacyNote;
  }

  /** Loads an image through the dropzone's file input. */
  async loadImage(absolutePath: string): Promise<void> {
    await this.fileInput.waitFor({ state: "attached" });
    await this.fileInput.setInputFiles(absolutePath);
  }

  /**
   * Waits until star detection has finished and reports how many stars were
   * found. Detection is asynchronous, so this polls the stage pill until it
   * shows a non-zero count rather than trusting the first render.
   */
  async waitForDetectedStars(timeout = 60_000): Promise<number> {
    // The pill is a presentational badge with no ARIA role of its own; the
    // `star-pill` class is the stable handle the component author provides.
    const pill = this.page.locator("dba-ui-pill-badge.star-pill");
    await expect(pill).toContainText(/[1-9]\d*\s+stars detected/i, { timeout });
    const text = (await pill.innerText()).trim();
    const match = text.match(/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  /** Selects a spike preset by its visible card name. */
  async selectPreset(name: AstroSpikePresetName): Promise<void> {
    await this.presetGroup.getByRole("radio", { name: new RegExp(name) }).click();
  }

  /** Returns the currently selected preset card. */
  getSelectedPreset(): Locator {
    return this.presetGroup.getByRole("radio", { checked: true });
  }

  /**
   * Locator for a slider row's range input. `dba-ui-micro-slider` renders no
   * accessible name of its own, so the row is anchored by its visible label
   * text and the slider resolved from inside it.
   */
  private getControlSlider(label: AstroSpikeControlLabel): Locator {
    return this.controlPanel
      .locator(".slider-row")
      .filter({ hasText: label })
      .getByRole("slider");
  }

  /** Drives one of the controls-pane sliders to an absolute value. */
  async setControlValue(
    label: AstroSpikeControlLabel,
    value: number,
  ): Promise<void> {
    const slider = this.getControlSlider(label);
    await slider.evaluate((el, next) => {
      const input = el as HTMLInputElement;
      input.value = String(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  /** Reads the readout text rendered beside a slider's label. */
  async getControlReadout(label: AstroSpikeControlLabel): Promise<string> {
    // `.slider-row` groups a label with its readout and slider; there is no
    // ARIA relationship exposed between them to query instead.
    const row = this.controlPanel
      .locator(".slider-row")
      .filter({ hasText: label });
    return (await row.locator(".row-value").innerText()).trim();
  }

  /** Switches between 4- and 6-arm spikes. */
  async setArmCount(count: 4 | 6): Promise<void> {
    await this.armsTabs
      .getByRole("tab", { name: `${count} spikes` })
      .click();
  }

  /** Returns the currently selected arm-count tab. */
  getSelectedArmTab(): Locator {
    return this.armsTabs.getByRole("tab", { selected: true });
  }

  /** Triggers an export and returns the suggested download filename. */
  async exportImage(): Promise<string> {
    const downloadPromise = this.page.waitForEvent("download", {
      timeout: 60_000,
    });
    await this.page
      .getByRole("button", { name: /^Export (PNG|JPEG)$/ })
      .click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  /** Locator for the visible spiked-result canvas. */
  getResultCanvas(): Locator {
    // Canvases expose no ARIA role; the component's `after-canvas` class is the
    // only stable handle available.
    return this.page.locator("canvas.after-canvas");
  }

  /** Locator for the before/after comparison divider. */
  getCompareHandle(): Locator {
    return this.page.getByRole("slider", {
      name: /before and after comparison/i,
    });
  }

  /** Clears the loaded image and returns the editor to its empty state. */
  async clearImage(): Promise<void> {
    await this.page.getByRole("button", { name: "Remove image" }).click();
  }

  /** Locator for one of the canvas tool-rail buttons, by its accessible name. */
  getCanvasTool(name: "Zoom in" | "Zoom out" | "Reset view" | "Remove image") {
    return this.page.getByRole("button", { name });
  }

  /** Opens a star's own controls by double-clicking it on the canvas. */
  async openStarControls(clientX: number, clientY: number): Promise<void> {
    await this.page.mouse.dblclick(clientX, clientY);
  }

  /** Locator for the per-star controls popover. */
  getStarControls() {
    return this.page.getByRole("dialog", { name: /spike controls/i });
  }
}
