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
    // Each filter row gets a name-scoped frames label (e.g. "Ha frames",
    // "Custom frames"). The newly added custom row is named "Custom" until
    // the user renames it, so this locator auto-waits for that specific row
    // to render before Playwright fires `fill`. Using the generic "Frames"
    // label with `.last()` is racy: between the click that adds the row and
    // the next action, Angular may not yet have flushed CD, so `.last()`
    // resolves to the previous final row's input.
    const framesInput = page.getByLabel("Custom frames", { exact: true });
    const nameInput = page.getByLabel("Filter name");
    await framesInput.fill("10");
    await nameInput.fill("CUSTOM-HA");
    await nameInput.blur();
    // Scope to the integration ring grid — the caption block also now
    // mentions "CUSTOM-HA" so a page-wide getByText would be ambiguous.
    const ringRow = page.getByTestId("integration-rings");
    await expect(ringRow.getByText("CUSTOM-HA")).toBeVisible();
  });

  test("Accent colour change reflects on the hero title", async ({
    page,
  }) => {
    // Inspector rail item that holds the primary Accent swatch was renamed
    // from "Style" to "Layout" in the Direction B redesign.
    await page.getByRole("button", { name: "Layout", exact: true }).first().click();
    // Disambiguate from the sibling "Secondary accent colour" input.
    const accentInput = page.getByLabel("Accent colour", { exact: true });
    await accentInput.evaluate((el: HTMLInputElement) => {
      el.value = "#00ff00";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // The Direction B card uses `--accent-color` on the `.pn-title` text
    // colour (the prior design used a hero border). Assert the dominant
    // green channel on the h1 inside the card hero.
    const title = page.getByTestId("card-hero").getByRole("heading", { level: 1 });
    const titleColor = await title.evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(titleColor).toMatch(/(?:rgb\([^)]*255[^)]*\))|(?:srgb\s+0\s+1\s+0)/);
  });

  test("Download button stays enabled after click", async ({ page }) => {
    // The card-preview FAB is an icon-only button with title="Export"
    // (replaces the legacy "Download card" name). It is the FIRST button
    // named "Export" in DOM order on the default desktop mount — preview
    // column renders before the inspector-rail Export item. The in-panel
    // Export CTA only exists when the Export panel is open (not the
    // default state), so `.first()` is unambiguous here.
    const downloadBtn = page
      .getByRole("button", { name: "Export", exact: true })
      .first();
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
    await page.getByRole("button", { name: "Object info", exact: true }).first().click();
    await page.getByLabel("Object name").fill("Andromeda Galaxy");
    await page.getByRole("button", { name: /Wiki/i }).click();
    // The textarea ships with seed text from the default CardData, so
    // a plain `not.toHaveValue("")` resolves instantly without waiting for
    // the wiki fetch. Poll the value until the appended extract contains
    // the queried object name.
    const captionTextarea = page.getByLabel("Long-form caption");
    await expect
      .poll(async () => (await captionTextarea.inputValue()).toLowerCase(), {
        timeout: 15000,
      })
      .toContain("andromeda");
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
