import { test, expect } from "@playwright/test";

test.describe("Astrogram Mobile DSO Fetch", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/db-astro-suite/astrogram/");
  });

  test("Search field and Find button layout on mobile", async ({ page }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Image Details" })
      .click();
    await page.waitForTimeout(600);

    const searchInput = page.locator("#dso-search-input");
    const findBtn = page
      .locator("button.fetch-btn")
      .filter({ hasText: "Find" });

    // On mobile (<480px) these should stack due to flex-direction: column in .description-header
    const header = page.locator(".description-header");
    const flexDirection = await header.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(flexDirection).toBe("column");

    await expect(searchInput).toBeVisible();
    await expect(findBtn).toBeVisible();

    // Verify functionality still works on mobile
    // Use fill directly as it should overwrite in Playwright if no existing input is stubborn
    await searchInput.fill("Orion Nebula");
    await findBtn.click();

    const descriptionTextarea = page.locator("dba-ui-textarea textarea");
    const defaultDesc =
      "The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn't see anything but it was just right there hidden among the stars. Here it is in pink on Valentine's Day 🌹";

    await expect(descriptionTextarea).not.toHaveValue(defaultDesc, {
      timeout: 15000,
    });
    const value = await descriptionTextarea.inputValue();
    console.log("Mobile Fetched Description:", value);
    expect(value.toLowerCase()).toContain("orion");
  });
});
