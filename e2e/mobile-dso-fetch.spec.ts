import { expect, test } from "@playwright/test";

test.describe("Astrogram Mobile DSO Fetch", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");
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

    // The caption section is the second .description-header (contains the search UI)
    const header = page.locator(".description-header").nth(1);
    const flexDirection = await header.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(flexDirection).toBe("column");

    await expect(searchInput).toBeVisible();
    await expect(findBtn).toBeVisible();

    // Verify functionality still works on mobile
    await searchInput.fill("Orion Nebula");
    await findBtn.click();

    // The Find button populates the caption field (second textarea)
    const captionTextarea = page.locator(
      'textarea[placeholder="Detailed caption for social media..."]',
    );
    const defaultCaption =
      "The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn't see anything but it was just right there hidden among the stars.";

    await expect(captionTextarea).not.toHaveValue(defaultCaption, {
      timeout: 15000,
    });
    const value = await captionTextarea.inputValue();
    console.log("Mobile Fetched Caption:", value);
    expect(value.toLowerCase()).toContain("orion");
  });
});
