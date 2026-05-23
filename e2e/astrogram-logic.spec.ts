import { expect, test } from "@playwright/test";

test.describe("Astrogram Logic & Functional Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");
    await expect(page.locator("dba-ag-card-preview").first()).toBeVisible();
    await expect(page.locator("dba-ag-inspector-panel-host")).toBeVisible();
  });

  test("Custom filter added in Capture panel appears on the card", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Capture" }).first().click();
    await page
      .locator("button.add-btn")
      .filter({ hasText: "Add custom filter" })
      .click();
    // The newly added custom row exposes a text input for its name; standard
    // rows display the name as a static label.
    const nameInput = page.locator("input.name-input").last();
    const framesInput = page.locator("input.num-input").nth(-2);
    await framesInput.fill("10");
    await nameInput.fill("CUSTOM-HA");
    await nameInput.blur();
    const ringLabel = page
      .locator("dba-ag-card-preview dba-ui-progress-ring .label")
      .last();
    await expect(ringLabel).toHaveText("CUSTOM-HA");
  });

  test("Accent colour change reflects on the hero block border", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Style" }).first().click();
    const accentInput = page
      .locator("dba-ui-color-swatch-input input[type='color']")
      .first();
    await accentInput.evaluate((el: HTMLInputElement) => {
      el.value = "#00ff00";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const hero = page.locator("dba-ag-card-preview .pn-hero").first();
    const borderColor = await hero.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toContain("255");
  });

  test("Download button stays enabled after click", async ({ page }) => {
    const downloadBtn = page.locator("button.download-fab");
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();
    await page.waitForTimeout(1000);
    await expect(downloadBtn).toBeEnabled();
  });

  test("Mobile shell renders the floating sheet at narrow widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator("dba-ag-mobile-shell")).toBeVisible();
    await expect(page.locator("dba-ui-floating-sheet")).toBeVisible();
  });

  test("Wiki fetch populates the long-form caption", async ({ page }) => {
    await page.getByRole("button", { name: "Object info" }).first().click();
    const nameInput = page.locator("dba-ui-micro-input input").first();
    await nameInput.fill("Andromeda Galaxy");
    await page.getByRole("button", { name: /Wiki/i }).click();
    const captionTextarea = page.locator("textarea.text-area").last();
    await expect(captionTextarea).not.toHaveValue("", { timeout: 15000 });
    const value = await captionTextarea.inputValue();
    expect(value.toLowerCase()).toContain("andromeda");
  });
});

test.describe("Astrogram SEO", () => {
  test("meta tags and structured data are correct", async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");

    await expect(page).toHaveTitle(
      "Astrogram - Professional Exposure Cards. Instantly.",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Astrogram - Professional Exposure Cards. Instantly.");

    const ogImage = await page.getAttribute(
      'meta[property="og:image"]',
      "content",
    );
    expect(ogImage).toContain("og-astrogram.png");

    const twitterCard = await page.getAttribute(
      'meta[property="twitter:card"]',
      "content",
    );
    expect(twitterCard).toBe("summary_large_image");

    const twitterSite = await page.getAttribute(
      'meta[name="twitter:site"]',
      "content",
    );
    expect(twitterSite).toBe("@sidthesloth92");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toContain("astrogram");

    const jsonLdText = await page.evaluate(
      () =>
        document.querySelector('script[type="application/ld+json"]')
          ?.textContent ?? "",
    );
    const jsonLd = JSON.parse(jsonLdText);
    expect(jsonLd["@type"]).toBe("WebApplication");
    expect(jsonLd.name).toBe("Astrogram");
    expect(jsonLd.applicationCategory).toBe("PhotographyApplication");
    expect(Array.isArray(jsonLd.featureList)).toBe(true);

    const noscriptHtml = await page.evaluate(
      () => document.querySelector("noscript")?.innerHTML ?? "",
    );
    expect(noscriptHtml).toContain(
      "Astrogram is a free web tool for astrophotographers",
    );
    expect(noscriptHtml).toContain("Plate solving");
  });
});
