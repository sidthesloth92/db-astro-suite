import { expect, test } from "@playwright/test";
import path from "path";
import { StellarMapPage } from "./pages/stellar-map.page";

// Fixture image shipped with the project — used for upload tests.
const ROSETTE_IMAGE = path.resolve(
  __dirname,
  "../tools/astrogram/public/assets/img/rosette.jpg",
);

test.describe("Stellar Map Mode", () => {
  let stellarMapPage: StellarMapPage;

  test.beforeEach(async ({ page }) => {
    stellarMapPage = new StellarMapPage(page);
    await stellarMapPage.navigate();
  });

  test("app loads in Infographic mode by default", async ({ page }) => {
    // Mode switcher must be visible with Infographic active
    await expect(stellarMapPage.getInfographicModeButton()).toBeVisible();
    await expect(stellarMapPage.getStellarMapModeButton()).toBeVisible();
    // Stellar map upload prompt must NOT appear in the default infographic state
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible();
  });

  test("switches to Stellar Map mode when tab is clicked", async ({ page }) => {
    await stellarMapPage.switchToStellarMapMode();

    // Upload target card is the empty-state UI in the preview panel
    await expect(stellarMapPage.getUploadTargetHeading()).toBeVisible();
    await expect(
      page.getByText("UPLOAD AN IMAGE TO BEGIN PLATE SOLVING"),
    ).toBeVisible();
    // ASTROSOLVE trigger must be present in the config panel
    await expect(stellarMapPage.getAstrosolveButton()).toBeVisible();
  });

  test("ASTROSOLVE button is disabled before image upload", async () => {
    await stellarMapPage.switchToStellarMapMode();
    await expect(stellarMapPage.getAstrosolveButton()).toBeDisabled();
  });

  test("ASTROSOLVE button is enabled after image upload", async () => {
    await stellarMapPage.switchToStellarMapMode();
    await stellarMapPage.uploadImage(ROSETTE_IMAGE);
    // The upload card should disappear once an image is loaded
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible({
      timeout: 5000,
    });
    await expect(stellarMapPage.getAstrosolveButton()).toBeEnabled();
  });

  test("switching back to Infographic mode hides the stellar map UI", async ({
    page,
  }) => {
    await stellarMapPage.switchToStellarMapMode();
    await expect(stellarMapPage.getUploadTargetHeading()).toBeVisible();

    await stellarMapPage.switchToInfographicMode();
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible();
    // ASTROSOLVE button belongs to stellar map mode only
    await expect(stellarMapPage.getAstrosolveButton()).not.toBeVisible();
  });

  test("stellar map empty state visual test", async ({ page }) => {
    await stellarMapPage.switchToStellarMapMode();
    await expect(stellarMapPage.getUploadTargetHeading()).toBeVisible();

    await expect(page).toHaveScreenshot("stellar-map-empty-state.png", {
      fullPage: true,
      timeout: 15000,
    });
  });
});
