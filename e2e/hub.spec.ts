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

  const twitterSite = await page.getAttribute(
    'meta[name="twitter:site"]',
    "content",
  );
  expect(twitterSite).toBe("@sidthesloth92");

  const jsonLdText = await page.evaluate(
    () =>
      document.querySelector('script[type="application/ld+json"]')
        ?.textContent ?? "",
  );
  const jsonLd = JSON.parse(jsonLdText);
  expect(jsonLd["@type"]).toBe("WebApplication");
  expect(jsonLd.name).toBe("DB Astro Suite");
  expect(Array.isArray(jsonLd.hasPart)).toBe(true);
  expect(jsonLd.hasPart).toHaveLength(4);
  const partNames = jsonLd.hasPart.map((part: { name: string }) => part.name);
  expect(partNames).toEqual(["Starwizz", "Astrogram", "Sortronomy", "Celestory"]);

  const noscriptHtml = await page.evaluate(
    () => document.querySelector("noscript")?.innerHTML ?? "",
  );
  expect(noscriptHtml).toContain("DB Astro Suite");
  expect(noscriptHtml).toContain("Starwizz");
  expect(noscriptHtml).toContain("Astrogram");
  expect(noscriptHtml).toContain("Sortronomy");
  expect(noscriptHtml).toContain("Celestory");
});

test.describe("Hub About page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/about");
    await expect(page.getByRole("heading", { name: "About", level: 1 })).toBeVisible();
  });

  test("should render the About hero heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "About", level: 1 }),
    ).toBeVisible();
  });

  test("should render the Why and About-Me sub-sections", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Why DB Astro Suite/i, level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /About Me/i, level: 2 }),
    ).toBeVisible();
  });

  test("should expose a Back to Home navigation link", async ({ page }) => {
    const backLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("should visually match the About page baseline", async ({ page }) => {
    await expect(page).toHaveScreenshot("hub-about.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});
