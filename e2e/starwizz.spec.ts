import { expect, test } from "@playwright/test";

test("Starwizz app visual test", async ({ page }) => {
  await page.goto("http://localhost:4200/starwizz/");
  await expect(page.locator("dba-sw-control-panel").first()).toBeVisible();

  // The WebGL canvas has randomly generated stars which will break pixel-to-pixel comparison.
  // We explicitly mask out the canvas so our test only asserts the UI controls are stable.
  await expect(page).toHaveScreenshot("starwizz-app.png", {
    mask: [page.locator("canvas")],
    fullPage: true,
    timeout: 15000,
  });
});

test("Starwizz SEO meta tags and structured data are correct", async ({
  page,
}) => {
  await page.goto("http://localhost:4200/starwizz/");
  await expect(page.locator("dba-sw-control-panel").first()).toBeVisible();

  await expect(page).toHaveTitle("Starwizz - 4K Starfield & Galaxy Generator");

  const ogTitle = await page.getAttribute(
    'meta[property="og:title"]',
    "content",
  );
  expect(ogTitle).toBe("Starwizz - 4K Starfield & Galaxy Generator");

  const ogImage = await page.getAttribute(
    'meta[property="og:image"]',
    "content",
  );
  expect(ogImage).toContain("preview.png");

  const twitterCard = await page.getAttribute(
    'meta[property="twitter:card"]',
    "content",
  );
  expect(twitterCard).toBe("summary_large_image");

  const canonical = await page.getAttribute('link[rel="canonical"]', "href");
  expect(canonical).toContain("starwizz");

  const jsonLdText = await page.evaluate(
    () =>
      document.querySelector('script[type="application/ld+json"]')
        ?.textContent ?? "",
  );
  const jsonLd = JSON.parse(jsonLdText);
  expect(jsonLd["@type"]).toBe("WebApplication");
  expect(jsonLd.name).toBe("Starwizz");
  expect(jsonLd.applicationCategory).toBe("MultimediaApplication");
  expect(Array.isArray(jsonLd.featureList)).toBe(true);

  const noscriptHtml = await page.evaluate(
    () => document.querySelector("noscript")?.innerHTML ?? "",
  );
  expect(noscriptHtml).toContain("Starwizz is a free browser-based tool");
  expect(noscriptHtml).toContain("4K");
});
