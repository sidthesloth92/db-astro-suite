import { expect, test } from "@playwright/test";
import path from "path";
import { AstroSpikePage } from "./pages/astrospike.page";

/**
 * A small synthetic star field with a known set of point sources, a nebulosity
 * gradient, one hot pixel, and one satellite trail — enough for detection to
 * produce a stable, non-trivial star list without a slow multi-megapixel decode.
 */
const STARFIELD_FIXTURE = path.resolve(
  __dirname,
  "fixtures/astrospike-starfield.png",
);

test.describe("AstroSpike", () => {
  test("should offer a dropzone that promises the image stays local once the sample is removed", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();

    // The studio opens on the bundled Pleiades sample; removing it is the way
    // to the dropzone.
    await astroSpike.clearImage();

    await expect(astroSpike.getDropzoneHeading()).toBeVisible();
    await expect(astroSpike.getPrivacyNote()).toBeVisible();
    // Nothing is in the way of it: the how-to waits to be asked for.
    await expect(astroSpike.getHowTo()).toHaveCount(0);
  });

  test("should open the how-to only when the title bar asks for it", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();

    await expect(astroSpike.getHowTo()).toHaveCount(0);
    await astroSpike.openHowTo();

    await expect(astroSpike.getHowTo()).toBeVisible();
    await expect(astroSpike.getHowTo()).toContainText("never leaves your browser");
  });

  test("should detect stars and render spikes as soon as an image is loaded", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);

    const starCount = await astroSpike.waitForDetectedStars();
    expect(starCount).toBeGreaterThan(5);

    await expect(astroSpike.getResultCanvas()).toBeVisible();
    // Classic is the default preset, so the four-arm card starts selected.
    await expect(astroSpike.getSelectedPreset()).toContainText("Classic");
  });

  test("should re-slice the spiked stars when the Stars slider moves", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    await astroSpike.setControlValue("Star magnitude", 0.2);
    const few = await astroSpike.getControlReadout("Star magnitude");
    await astroSpike.setControlValue("Star magnitude", 1);
    const many = await astroSpike.getControlReadout("Star magnitude");

    const parseCount = (readout: string): number =>
      Number.parseInt(readout.split(" ")[0], 10);
    expect(parseCount(many)).toBeGreaterThan(parseCount(few));
  });

  test("should switch to six spikes when the JWST preset is selected", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    await astroSpike.selectPreset("JWST");

    await expect(astroSpike.getSelectedPreset()).toContainText("JWST");
    await expect(astroSpike.getSelectedArmTab()).toHaveText("6 spikes");
  });

  test("should let the user override the arm count after choosing a preset", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    await astroSpike.selectPreset("JWST");
    await astroSpike.setArmCount(4);

    await expect(astroSpike.getSelectedArmTab()).toHaveText("4 spikes");
    // Changing an unrelated slider must not undo the manual override.
    await astroSpike.setControlValue("Length", 1.5);
    await expect(astroSpike.getSelectedArmTab()).toHaveText("4 spikes");
  });

  test("should offer a diffusion slider that softens the spikes into a bloom", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    // Sharp spikes by default, so an image opens as its preset intends.
    expect(await astroSpike.getControlReadout("Diffusion")).toBe("0");

    await astroSpike.setControlValue("Diffusion", 1);

    expect(await astroSpike.getControlReadout("Diffusion")).toBe("1");
    // Diffusion is orthogonal to the preset, which is left as it was.
    await expect(astroSpike.getSelectedPreset()).toContainText("Classic");
    await expect(astroSpike.getSelectedArmTab()).toHaveText("4 spikes");
  });

  test("should show a before and after comparison divider once an image is loaded", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    const handle = astroSpike.getCompareHandle();
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("aria-valuenow", "0");

    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect(handle).not.toHaveAttribute("aria-valuenow", "0");
  });

  test("should export a file named after the source image and its resolution", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    const filename = await astroSpike.exportImage();

    expect(filename).toContain("astrospike");
    // The fixture is 900x600 and export must preserve the original resolution.
    expect(filename).toContain("900_600");
    expect(filename).toMatch(/\.png$/);
  });

  test("should offer zoom and remove tools on the canvas", async ({ page }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    // The whole image is in view, so zooming out is not available yet.
    await expect(astroSpike.getCanvasTool("Zoom out")).toBeDisabled();
    await astroSpike.getCanvasTool("Zoom in").click();
    await expect(astroSpike.getCanvasTool("Zoom out")).toBeEnabled();

    await astroSpike.getCanvasTool("Fit to view").click();
    await expect(astroSpike.getCanvasTool("Zoom out")).toBeDisabled();
  });

  test("should offer a chroma control that separates the arm colour", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    // On by default, restrained: it is what makes an arm read as light rather
    // than a drawn line.
    expect(await astroSpike.getControlReadout("Chroma")).toBe("0.35");

    await astroSpike.setControlValue("Chroma", 0);

    expect(await astroSpike.getControlReadout("Chroma")).toBe("0");
  });

  test("should export the spikes alone as a transparent layer", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    await astroSpike.selectExportOutput(/Spikes only, transparent/i);

    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: /^Export layer$/ }).click();
    const download = await downloadPromise;

    // Named apart from a finished export, and still at the source resolution.
    expect(download.suggestedFilename()).toMatch(
      /_astrospike_layer_900_600\.png$/,
    );
  });

  test("should let the user place a star that detection missed", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    const detected = await astroSpike.waitForDetectedStars();

    const tool = astroSpike.getCanvasTool("Add a star detection missed");
    await tool.click();
    // Arming the tool turns the pointer into a crosshair over the canvas.
    await expect(astroSpike.getResultCanvas()).toBeVisible();

    const canvas = page.locator("canvas.marker-canvas");
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("marker canvas has no layout");
    }
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.85);

    // The star list grows by one while the reported detection count does not:
    // a placed star is not a detected one. Retrying, because the signal updates
    // synchronously but the DOM catches up on the next change detection.
    // The list total grows by one. There is no standing "detected" figure to
    // compare against any more: the badge states the detection count once and
    // clears, by design.
    await expect(astroSpike.getControlRow("Star magnitude")).toContainText(
      `of ${detected + 1}`,
    );
  });

  test("should reset the look to its defaults without re-running detection", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    const detected = await astroSpike.waitForDetectedStars();

    await expect(astroSpike.getResetButton()).toHaveCount(0);

    await astroSpike.selectPreset("JWST");
    await astroSpike.setControlValue("Length", 2.4);
    await astroSpike.setControlValue("Diffusion", 0.7);
    await expect(astroSpike.getResetButton()).toBeVisible();

    await astroSpike.getResetButton().click();

    await expect(astroSpike.getSelectedPreset()).toContainText("Classic");
    expect(await astroSpike.getControlReadout("Length")).toBe("1×");
    expect(await astroSpike.getControlReadout("Diffusion")).toBe("0");
    // Detection is the expensive part and its result has not changed.
    expect(await astroSpike.waitForDetectedStars()).toBe(detected);
    await expect(astroSpike.getResetButton()).toHaveCount(0);
  });

  test("should return to the dropzone when the image is cleared", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();
    await astroSpike.loadImage(STARFIELD_FIXTURE);
    await astroSpike.waitForDetectedStars();

    await astroSpike.clearImage();

    await expect(astroSpike.getDropzoneHeading()).toBeVisible();
  });
});
