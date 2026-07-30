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
  test("should offer a dropzone and promise that the image stays local", async ({
    page,
  }) => {
    const astroSpike = new AstroSpikePage(page);
    await astroSpike.navigate();

    await expect(astroSpike.getDropzoneHeading()).toBeVisible();
    await expect(astroSpike.getPrivacyNote()).toBeVisible();
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

    await astroSpike.setControlValue("Stars", 0.2);
    const few = await astroSpike.getControlReadout("Stars");
    await astroSpike.setControlValue("Stars", 1);
    const many = await astroSpike.getControlReadout("Stars");

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

    await astroSpike.getCanvasTool("Reset view").click();
    await expect(astroSpike.getCanvasTool("Zoom out")).toBeDisabled();
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
