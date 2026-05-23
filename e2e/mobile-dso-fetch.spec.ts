import { expect, test } from "@playwright/test";

test.describe("Astrogram Mobile DSO Fetch", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");
    await expect(page.locator("dba-ag-mobile-shell")).toBeVisible();
  });

  test("Wiki fetch from the mobile Object info panel populates the caption", async ({
    page,
  }) => {
    // The mobile sheet starts expanded on the default "Info" tab; tap the
    // bottom-nav item to make sure we're on it.
    await page.getByRole("tab", { name: "Info" }).click();

    // Set a known target into the title field, then click Wiki.
    const nameInput = page.locator("dba-ui-micro-input input").first();
    await nameInput.fill("Orion Nebula");
    await page.getByRole("button", { name: /Wiki/i }).click();

    // The long-form caption textarea is the second .text-area in the panel.
    const captionTextarea = page.locator("textarea.text-area").last();
    await expect(captionTextarea).not.toHaveValue("", { timeout: 15000 });
    const value = await captionTextarea.inputValue();
    expect(value.toLowerCase()).toContain("orion");
  });
});
