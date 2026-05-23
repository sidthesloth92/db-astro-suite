import { expect, test } from "@playwright/test";
import { AstrogramDesktopPage } from "./pages/astrogram-desktop.page";
import { AstrogramMobilePage } from "./pages/astrogram-mobile.page";

/**
 * Visual regression scaffolding. Baselines are generated in CI only —
 * never commit locally-generated `.png` files. Run
 * `pnpm test:e2e:update` in CI (Linux/Docker) to refresh the baseline
 * set.
 *
 * Marked `.serial` so the four snapshots run in a stable order, which
 * keeps the diff reports tidy when one of the four needs regenerating.
 */
test.describe.serial("Visual regression", () => {
  test("desktop infographic mode default mount", async ({ page }) => {
    const astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
    await expect(page).toHaveScreenshot("desktop-infographic.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("desktop stellar mode after switching tabs", async ({ page }) => {
    const astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
    await astrogram.switchToStellarMode();
    await expect(page).toHaveScreenshot("desktop-stellar.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("mobile infographic mode with sheet collapsed", async ({ page }) => {
    const astrogram = new AstrogramMobilePage(page);
    await astrogram.navigate();
    await astrogram.collapseFloatingSheet();
    await expect(page).toHaveScreenshot("mobile-infographic.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("mobile stellar mode with sheet collapsed", async ({ page }) => {
    const astrogram = new AstrogramMobilePage(page);
    await astrogram.navigate();
    await astrogram.switchToStellarMode();
    await astrogram.collapseFloatingSheet();
    await expect(page).toHaveScreenshot("mobile-stellar.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});
