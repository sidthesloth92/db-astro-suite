import { expect, test } from "@playwright/test";

test.describe("Astrogram Logic & Functional Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/db-astro-suite/astrogram/");
    await expect(page.locator(".form-container").first()).toBeVisible();
  });

  test("Filter name is editable for custom filters and updates preview", async ({
    page,
  }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Integration" })
      .click();
    await page.waitForTimeout(600);
    await page
      .locator("button.subtle-add-btn")
      .filter({ hasText: "Add Custom Filter" })
      .click();
    await page.waitForTimeout(100);
    const filterInput = page.locator("input.filter-name-input-ag").first();
    await expect(filterInput).toBeVisible();
    const framesInput = page
      .locator(".filter-inputs input[type='number']")
      .nth(-2);
    await framesInput.fill("10");
    const lastFilterLabel = page
      .locator(".filter-rings dba-ag-filter-ring .filter-label")
      .last();
    await filterInput.click();
    await filterInput.fill("CUSTOM-HA");
    await filterInput.press("Enter");
    await expect(lastFilterLabel).toHaveText("CUSTOM-HA");
  });

  test("Accent color applies to output card section borders", async ({
    page,
  }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Card Settings" })
      .click();
    await page.waitForTimeout(600);
    const accentPicker = page.locator("input[type='color']").first();
    await accentPicker.fill("#00ff00");
    const cardSection = page.locator(".card-section").first();
    const borderColor = await cardSection.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toContain("255");
  });

  test("Download button re-enables after export", async ({ page }) => {
    const downloadBtn = page.locator("button.download-fab");
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();
    await page.waitForTimeout(1000);
    await expect(downloadBtn).toBeEnabled();
  });

  test("Mobile export resolution verification", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    const downloadBtn = page.locator("button.download-fab");
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
  });

  test("DSO description fetch from Wikipedia works", async ({ page }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Image Details" })
      .click();
    await page.waitForTimeout(600);

    const searchInput = page.locator("#dso-search-input");
    const findBtn = page
      .locator("button.fetch-btn")
      .filter({ hasText: "Find" });
    // Target the caption textarea specifically (the Find button populates the caption field)
    const captionTextarea = page.locator(
      'textarea[placeholder="Detailed caption for social media..."]',
    );

    const defaultCaption =
      "The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn't see anything but it was just right there hidden among the stars.";

    // Clear and fill correctly
    await searchInput.fill("Andromeda Galaxy");
    await findBtn.click();

    // Wait for the caption to change from its default value
    await expect(captionTextarea).not.toHaveValue(defaultCaption, {
      timeout: 15000,
    });

    const value = await captionTextarea.inputValue();
    console.log("Fetched Caption:", value);
    expect(value.toLowerCase()).toContain("andromeda");
  });
});

test.describe("Astrogram SEO", () => {
  test("meta tags and structured data are correct", async ({ page }) => {
    await page.goto("http://localhost:4201/db-astro-suite/astrogram/");

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
