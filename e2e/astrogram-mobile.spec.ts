import { expect, test } from "@playwright/test";
import { AstrogramMobilePage } from "./pages/astrogram-mobile.page";

/**
 * Mobile astrogram flows — exercises the floating-sheet + bottom-nav
 * interaction model unique to the compact shell. Each test is fully
 * isolated: a fresh page + viewport is created for every spec via the
 * Playwright `page` fixture, and beforeEach re-navigates.
 */
test.describe("Astrogram mobile", () => {
  let astrogram: AstrogramMobilePage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramMobilePage(page);
    await astrogram.navigate();
  });

  test("should render the mobile shell at 390x844 viewport", async () => {
    await expect(astrogram.getMobileShellMount()).toBeVisible();
    // Desktop shell sentinel must be entirely absent below the breakpoint.
    await expect(astrogram.getDesktopShellMount()).toHaveCount(0);
  });

  test("should expand the floating sheet when tapping a bottom-nav item", async () => {
    // Default mobile state has the sheet COLLAPSED on the "Layout"
    // section — tapping a bottom-nav item must expand it.
    await astrogram.expectSheetCollapsed();

    await astrogram.tapBottomNavItem("Capture");
    await astrogram.expectSheetExpanded();
    await astrogram.expectSheetTitle("Capture");
  });

  test("should collapse the sheet when tapping the same nav item twice", async () => {
    await astrogram.tapBottomNavItem("Capture");
    await astrogram.expectSheetExpanded();

    // Re-tapping the active item toggles the sheet closed.
    await astrogram.tapBottomNavItem("Capture");
    await astrogram.expectSheetCollapsed();
  });

  test("should collapse the sheet when tapping the X close button", async () => {
    // Expand the sheet first — default state is collapsed.
    await astrogram.tapBottomNavItem("Info");
    await astrogram.expectSheetExpanded();
    await astrogram.collapseFloatingSheet();
    await astrogram.expectSheetCollapsed();
  });

  test("should keep the card preview visible while the sheet is expanded", async () => {
    await astrogram.tapBottomNavItem("Info");
    await astrogram.expectSheetExpanded();
    expect(await astrogram.isCardPreviewVisible()).toBe(true);
  });

  test("should swap panel content when tapping a different bottom-nav item", async () => {
    // Tap Gear — the bottom-nav label for the Equipment section.
    // Sheet expands and aria-label flips to "Equipment".
    await astrogram.tapBottomNavItem("Gear");
    await astrogram.expectSheetExpanded();
    await astrogram.expectSheetTitle("Equipment");
  });
});
