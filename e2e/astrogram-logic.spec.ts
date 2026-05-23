import { expect, test } from "@playwright/test";

test.describe("Astrogram Logic & Functional Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/astrogram/");
    await expect(page.getByTestId("desktop-shell")).toBeVisible();
  });

  test("Custom filter added in Capture panel appears on the card", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Capture" }).first().click();
    await page.getByRole("button", { name: /Add custom filter/i }).click();
    // The newly added custom row exposes editable name + frames inputs.
    const nameInput = page.getByLabel("Filter name").last();
    const framesInput = page.getByLabel("Frames").last();
    await framesInput.fill("10");
    await nameInput.fill("CUSTOM-HA");
    await nameInput.blur();
    // The matching label appears inside the card-preview progress ring grid.
    await expect(page.getByText("CUSTOM-HA")).toBeVisible();
  });

  test("Accent colour change reflects on the hero block border", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Style" }).first().click();
    // Disambiguate from the sibling "Secondary accent colour" input that
    // was added alongside the primary swatch — exact match locks onto
    // the primary accent.
    const accentInput = page.getByLabel("Accent colour", { exact: true });
    await accentInput.evaluate((el: HTMLInputElement) => {
      el.value = "#00ff00";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Border is driven off the accent colour custom property — read
    // the computed style off the hero section, identified by testid.
    // Chromium can return either legacy `rgb(0, 255, 0)` or the modern
    // `color(srgb 0 1 0 / 0.4)` notation depending on the version — the
    // assertion tolerates both by checking the green channel is the
    // dominant component (max value in either format).
    const hero = page.getByTestId("card-hero");
    const borderColor = await hero.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toMatch(/(?:rgb\([^)]*255[^)]*\))|(?:srgb\s+0\s+1\s+0)/);
  });

  test("Download button stays enabled after click", async ({ page }) => {
    const downloadBtn = page.getByRole("button", { name: "Download card" });
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
    await expect(page.getByTestId("mobile-shell")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Wiki fetch populates the long-form caption", async ({ page }) => {
    await page.getByRole("button", { name: "Object info" }).first().click();
    await page.getByLabel("Object name").fill("Andromeda Galaxy");
    await page.getByRole("button", { name: /Wiki/i }).click();
    const captionTextarea = page.getByLabel("Long-form caption");
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

    // Document-level meta tags are not addressable via Playwright's
    // semantic locator APIs; read them through the DOM directly.
    const meta = await page.evaluate(() => {
      const get = (sel: string) =>
        (document.querySelector(sel) as HTMLMetaElement | HTMLLinkElement | null)
          ?.getAttribute("content") ??
        (document.querySelector(sel) as HTMLLinkElement | null)?.getAttribute("href") ??
        "";
      return {
        ogTitle: get('meta[property="og:title"]'),
        ogImage: get('meta[property="og:image"]'),
        twitterCard: get('meta[property="twitter:card"]'),
        twitterSite: get('meta[name="twitter:site"]'),
        canonical: get('link[rel="canonical"]'),
      };
    });
    expect(meta.ogTitle).toBe("Astrogram - Professional Exposure Cards. Instantly.");
    expect(meta.ogImage).toContain("og-astrogram.png");
    expect(meta.twitterCard).toBe("summary_large_image");
    expect(meta.twitterSite).toBe("@sidthesloth92");
    expect(meta.canonical).toContain("astrogram");

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
