import { expect, test } from "@playwright/test";

test("Hub homepage visual test", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await expect(page).toHaveScreenshot("hub-homepage.png", { fullPage: true });
});

test("Hub SEO meta tags and structured data are correct", async ({ page }) => {
  await page.goto("http://localhost:5173/");

  await expect(page).toHaveTitle(
    "DB Astro Suite - Professional Astrophotography Tools",
  );

  const ogTitle = await page.getAttribute(
    'meta[property="og:title"]',
    "content",
  );
  expect(ogTitle).toBe("DB Astro Suite - From Sensor to Social");

  const ogImage = await page.getAttribute(
    'meta[property="og:image"]',
    "content",
  );
  expect(ogImage).toContain("og-dbastrosuite.png");

  const description = await page.getAttribute(
    'meta[name="description"]',
    "content",
  );
  expect(description).toBeTruthy();
  expect(description!.length).toBeGreaterThan(20);

  const jsonLdText = await page.evaluate(
    () =>
      document.querySelector('script[type="application/ld+json"]')
        ?.textContent ?? "",
  );
  const jsonLd = JSON.parse(jsonLdText);
  expect(jsonLd["@type"]).toBe("WebApplication");
  expect(jsonLd.name).toBe("DB Astro Suite");
  expect(Array.isArray(jsonLd.hasPart)).toBe(true);
  expect(jsonLd.hasPart).toHaveLength(2);
});
