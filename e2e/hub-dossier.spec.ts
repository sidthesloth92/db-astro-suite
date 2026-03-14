import { expect, test } from "@playwright/test";

test.describe("Astrogram Dossier Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/dossier/astrogram");
    await expect(page.locator(".overview-section").first()).toBeVisible();
  });

  test("Astrogram dossier visual test", async ({ page }) => {
    await expect(page).toHaveScreenshot("astrogram-dossier.png", {
      fullPage: true,
      timeout: 15000,
    });
  });

  test("Astrogram dossier SEO meta tags are correct", async ({ page }) => {
    await expect(page).toHaveTitle(
      "Astrogram Dossier - Professional Exposure Cards",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Astrogram Dossier - Professional Exposure Cards");

    const ogImage = await page.getAttribute(
      'meta[property="og:image"]',
      "content",
    );
    expect(ogImage).toContain("og-astrogram.png");

    const description = await page.getAttribute(
      'meta[name="description"]',
      "content",
    );
    expect(description).toBeTruthy();
    expect(description!.toLowerCase()).toContain("astrogram");

    const twitterCard = await page.getAttribute(
      'meta[name="twitter:card"]',
      "content",
    );
    expect(twitterCard).toBe("summary_large_image");

    const twitterTitle = await page.getAttribute(
      'meta[name="twitter:title"]',
      "content",
    );
    expect(twitterTitle).toBe(
      "Astrogram Dossier - Professional Exposure Cards",
    );

    const twitterImage = await page.getAttribute(
      'meta[name="twitter:image"]',
      "content",
    );
    expect(twitterImage).toContain("og-astrogram.png");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toBe("https://dbastrosuite.com/dossier/astrogram");
  });

  test("Astrogram dossier layout: overview is full width", async ({ page }) => {
    const overviewSection = page.locator(".overview-section");
    await expect(overviewSection).toBeVisible();
    await expect(overviewSection.locator("dba-ui-card")).toBeVisible();

    // Overview should be full width (no sibling in a grid on the same row)
    const featuresSection = page.locator(".features-section");
    await expect(featuresSection).toBeVisible();

    // Both overview and features are siblings at the top level, not inside a grid
    const overviewBoundingBox = await overviewSection.boundingBox();
    const featuresBoundingBox = await featuresSection.boundingBox();
    expect(overviewBoundingBox).not.toBeNull();
    expect(featuresBoundingBox).not.toBeNull();
    // They should be stacked vertically (features top >= overview bottom)
    expect(featuresBoundingBox!.y).toBeGreaterThan(overviewBoundingBox!.y);
  });

  test("Astrogram dossier layout: features grid has 6 items", async ({
    page,
  }) => {
    const featuresGrid = page.locator(".features-grid");
    await expect(featuresGrid).toBeVisible();

    const featureItems = page.locator(".feature-item");
    await expect(featureItems).toHaveCount(6);

    // Each item should have an icon, a strong label, and a span description
    const firstItem = featureItems.first();
    await expect(firstItem.locator(".feature-icon")).toBeVisible();
    await expect(firstItem.locator("strong")).toBeVisible();
    await expect(firstItem.locator("span")).toBeVisible();
  });

  test("Astrogram dossier layout: How It Works and Demo are side by side", async ({
    page,
  }) => {
    const bottomGrid = page.locator(".bottom-grid");
    await expect(bottomGrid).toBeVisible();

    const howItWorks = page.locator(".how-it-works-section");
    const demo = page.locator(".demo-section");
    await expect(howItWorks).toBeVisible();
    await expect(demo).toBeVisible();

    // On desktop they should be on the same row (similar Y position)
    const howBox = await howItWorks.boundingBox();
    const demoBox = await demo.boundingBox();
    expect(howBox).not.toBeNull();
    expect(demoBox).not.toBeNull();
    expect(Math.abs(howBox!.y - demoBox!.y)).toBeLessThan(50);

    // Steps list should be present in How It Works
    const stepsList = page.locator(".steps-list");
    await expect(stepsList).toBeVisible();
    const steps = page.locator(".steps-list li");
    expect(await steps.count()).toBe(5);

    // Demo image should be present
    const demoImage = page.locator('.demo-section img[alt="Astrogram Demo"]');
    await expect(demoImage).toBeVisible();
  });
});

test.describe("Starwizz Dossier Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/dossier/starwizz");
    await expect(page.locator(".overview-section").first()).toBeVisible();
  });

  test("Starwizz dossier visual test", async ({ page }) => {
    await expect(page).toHaveScreenshot("starwizz-dossier.png", {
      fullPage: true,
      timeout: 15000,
    });
  });

  test("Starwizz dossier SEO meta tags are correct", async ({ page }) => {
    await expect(page).toHaveTitle("Starwizz - Cinematic Starfield Generator");

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Starwizz - Cinematic Starfield Generator");

    const ogImage = await page.getAttribute(
      'meta[property="og:image"]',
      "content",
    );
    expect(ogImage).toContain("preview.png");

    const description = await page.getAttribute(
      'meta[name="description"]',
      "content",
    );
    expect(description).toBeTruthy();
    expect(description!.toLowerCase()).toContain("starwizz");

    const twitterCard = await page.getAttribute(
      'meta[name="twitter:card"]',
      "content",
    );
    expect(twitterCard).toBe("summary_large_image");

    const twitterTitle = await page.getAttribute(
      'meta[name="twitter:title"]',
      "content",
    );
    expect(twitterTitle).toBe("Starwizz - Cinematic Starfield Generator");

    const twitterImage = await page.getAttribute(
      'meta[name="twitter:image"]',
      "content",
    );
    expect(twitterImage).toContain("preview.png");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toBe("https://dbastrosuite.com/dossier/starwizz");
  });

  test("Starwizz dossier layout: overview is full width", async ({ page }) => {
    const overviewSection = page.locator(".overview-section");
    await expect(overviewSection).toBeVisible();
    await expect(overviewSection.locator("dba-ui-card")).toBeVisible();

    const featuresSection = page.locator(".features-section");
    await expect(featuresSection).toBeVisible();

    const overviewBoundingBox = await overviewSection.boundingBox();
    const featuresBoundingBox = await featuresSection.boundingBox();
    expect(overviewBoundingBox).not.toBeNull();
    expect(featuresBoundingBox).not.toBeNull();
    expect(featuresBoundingBox!.y).toBeGreaterThan(overviewBoundingBox!.y);
  });

  test("Starwizz dossier layout: features grid has 3 items", async ({
    page,
  }) => {
    const featuresGrid = page.locator(".features-grid");
    await expect(featuresGrid).toBeVisible();

    const featureItems = page.locator(".feature-item");
    await expect(featureItems).toHaveCount(3);

    const firstItem = featureItems.first();
    await expect(firstItem.locator(".feature-icon")).toBeVisible();
    await expect(firstItem.locator("strong")).toBeVisible();
    await expect(firstItem.locator("span")).toBeVisible();
  });

  test("Starwizz dossier layout: How It Works and Demo are side by side", async ({
    page,
  }) => {
    const bottomGrid = page.locator(".bottom-grid");
    await expect(bottomGrid).toBeVisible();

    const howItWorks = page.locator(".how-it-works-section");
    const demo = page.locator(".demo-section");
    await expect(howItWorks).toBeVisible();
    await expect(demo).toBeVisible();

    const howBox = await howItWorks.boundingBox();
    const demoBox = await demo.boundingBox();
    expect(howBox).not.toBeNull();
    expect(demoBox).not.toBeNull();
    expect(Math.abs(howBox!.y - demoBox!.y)).toBeLessThan(50);

    const stepsList = page.locator(".steps-list");
    await expect(stepsList).toBeVisible();
    const steps = page.locator(".steps-list li");
    expect(await steps.count()).toBe(5);

    // Demo gif should be present
    const demoImage = page.locator('.demo-section img[alt="Starwizz Demo"]');
    await expect(demoImage).toBeVisible();
  });
});
