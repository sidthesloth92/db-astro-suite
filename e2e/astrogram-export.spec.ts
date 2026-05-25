import { expect, test } from "@playwright/test";
import { AstrogramDesktopPage } from "./pages/astrogram-desktop.page";

/**
 * Behavioural coverage for the redesigned Export panel — format radio
 * persistence, download filename suffix, and the disabled state when
 * there is nothing to export.
 *
 * BLOCKERS (see test-engineer report): the share grid (Twitter /
 * Pinterest / Direct / Instagram) is declared on
 * `ExportPanelComponent.shareTargets` but not rendered in the
 * template. Those flows are deferred until the markup ships.
 */
test.describe("Astrogram Export panel — format selection", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
    // Format persists via STORAGE_SERVICE_TOKEN; reset to the JPEG
    // default before each test so format-specific assertions are not
    // contaminated by sibling tests.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(astrogram.getDesktopShellMount()).toBeVisible();
  });

  test("should default to JPEG and produce a .jpg filename on export", async () => {
    await astrogram.openExportPanel();
    const download = await astrogram.triggerExport();
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.jpg$/);
  });

  test("should produce a .png filename when PNG is selected", async () => {
    await astrogram.openExportPanel();
    await astrogram.setExportFormat("png");
    const download = await astrogram.triggerExport();
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.png$/);
  });

  test("should produce a .webp filename when WebP is selected", async () => {
    await astrogram.openExportPanel();
    await astrogram.setExportFormat("webp");
    const download = await astrogram.triggerExport();
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.webp$/);
  });

  test("should persist the selected format across panel navigations", async ({ page }) => {
    await astrogram.openExportPanel();
    await astrogram.setExportFormat("png");
    // Navigate to a different panel, then back to Export.
    await astrogram.openLayoutPanel();
    await astrogram.openExportPanel();
    // The behavioural persistence contract is "PNG is still the active
    // format after navigating away and back". Assert via the radio row's
    // aria-pressed / active-class state on the PNG row rather than
    // running the export pipeline twice (which is slow + flaky on the
    // back-to-back trigger path).
    const pngRow = page.getByRole("button", { name: /^PNG\b/ });
    await expect(pngRow).toHaveClass(/is-active/);
  });
});

test.describe("Astrogram Export panel — disabled state", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
  });

  test("should disable the Export CTA in Stellar mode when no image is uploaded", async () => {
    await astrogram.switchToStellarMode();
    await astrogram.openExportPanel();
    await expect(astrogram.getExportPanelCta()).toBeDisabled();
  });
});

test.describe("Astrogram Export panel — visual baselines", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(astrogram.getDesktopShellMount()).toBeVisible();
  });

  test("should visually match the Export panel with PNG selected", async ({
    page,
  }) => {
    await astrogram.openExportPanel();
    await astrogram.setExportFormat("png");
    await expect(page).toHaveScreenshot("desktop-export-png.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("should visually match the Export panel with JPEG selected", async ({
    page,
  }) => {
    await astrogram.openExportPanel();
    await astrogram.setExportFormat("jpeg");
    await expect(page).toHaveScreenshot("desktop-export-jpeg.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});
