import { expect, test } from "@playwright/test";

test.describe("Astrogram Layout & Interactivity Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");
    await expect(page.locator("dba-ag-card-preview").first()).toBeVisible();
    // Wait for the inspector panel host to render — confirms the new shell mounted.
    await expect(page.locator("dba-ag-inspector-panel-host")).toBeVisible();
  });

  test("Default card form visual test", async ({ page }) => {
    await expect(page).toHaveScreenshot("astrogram-app-default.png", {
      timeout: 15000,
      fullPage: true,
    });
  });

  test("Style panel + format change visual test", async ({ page }) => {
    // Open the Style panel via the inspector rail.
    await page.getByRole("button", { name: "Style" }).first().click();
    // Pick the 4:5 format row.
    await page
      .locator(".format-row")
      .filter({ hasText: "Old Instagram Post" })
      .click();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("astrogram-app-aspect-ratio.png", {
      timeout: 15000,
      fullPage: true,
    });
  });

  // The legacy accordion layout has been replaced by the icon-rail inspector.
  // Each entry maps a rail item label to the snapshot filename used in CI.
  const panelsToTest = [
    { railLabel: "Object info", filename: "object" },
    { railLabel: "Capture", filename: "capture" },
    { railLabel: "Equipment", filename: "equipment" },
    { railLabel: "Style", filename: "style" },
    { railLabel: "Export", filename: "export" },
  ];

  for (const panel of panelsToTest) {
    test(`Open ${panel.filename} panel visual test`, async ({ page }) => {
      await page.getByRole("button", { name: panel.railLabel }).first().click();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(
        `astrogram-app-expanded-${panel.filename}.png`,
        {
          timeout: 15000,
          fullPage: true,
        },
      );
    });
  }
});
