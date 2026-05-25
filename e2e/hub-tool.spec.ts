import { expect, test } from "@playwright/test";
import { HubToolPage } from "./pages/hub-tool.page";

test.describe("Astrogram Tool Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/tool/astrogram");
    await expect(page.locator(".overview-section").first()).toBeVisible();
  });

  test("Astrogram tool visual test", async ({ page }) => {
    await expect(page).toHaveScreenshot("astrogram-tool.png", {
      fullPage: true,
      timeout: 15000,
    });
  });

  test("Astrogram tool SEO meta tags are correct", async ({ page }) => {
    await expect(page).toHaveTitle(
      "Astrogram Tool - Professional Exposure Cards",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Astrogram Tool - Professional Exposure Cards");

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
      "Astrogram Tool - Professional Exposure Cards",
    );

    const twitterImage = await page.getAttribute(
      'meta[name="twitter:image"]',
      "content",
    );
    expect(twitterImage).toContain("og-astrogram.png");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toBe("https://dbastrosuite.com/tool/astrogram");
  });

  test("Astrogram tool layout: overview is full width", async ({ page }) => {
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

  test("Astrogram tool layout: features grid has 6 items", async ({
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

  test("Astrogram tool layout: How It Works and Demo are side by side", async ({
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

test.describe("Starwizz Tool Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/tool/starwizz");
    await expect(page.locator(".overview-section").first()).toBeVisible();
  });

  test("Starwizz tool visual test", async ({ page }) => {
    await expect(page).toHaveScreenshot("starwizz-tool.png", {
      fullPage: true,
      timeout: 15000,
    });
  });

  test("Starwizz tool SEO meta tags are correct", async ({ page }) => {
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
    expect(canonical).toBe("https://dbastrosuite.com/tool/starwizz");
  });

  test("Starwizz tool layout: overview is full width", async ({ page }) => {
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

  test("Starwizz tool layout: features grid has 3 items", async ({
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

  test("Starwizz tool layout: How It Works and Demo are side by side", async ({
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

test.describe("File Grouper Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("file-grouper");
  });

  test("should render the file-grouper hero heading", async ({ page }) => {
    await expect(hubTool.getHeroHeading()).toContainText("file grouper");
    // The file-grouper page renders Overview / Features / Setup &
    // Usage as <dba-ui-card> titles — assert the Overview heading
    // exists rather than coupling to a section CSS class.
    await expect(page.getByText("Overview", { exact: true })).toBeVisible();
    await expect(
      page.getByText("File Grouper is a platform-agnostic", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test("should render exactly three feature items", async () => {
    // The file-grouper page lists features as a `<ul class="specs-list">`
    // rather than the `.feature-item` grid used by astrogram/starwizz.
    // The row count is still the user-facing contract.
    const specs = hubTool.getSpecsListItems();
    await expect(specs).toHaveCount(3);
  });

  test("should expose the canonical, og, and twitter SEO meta tags", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(
      "File Grouper Tool - Dataset Organization Utility",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("File Grouper - Organize Your Space Data");

    const description = await page.getAttribute(
      'meta[name="description"]',
      "content",
    );
    expect(description).toBeTruthy();
    expect(description!.toLowerCase()).toContain("astrophotography");

    const twitterCard = await page.getAttribute(
      'meta[name="twitter:card"]',
      "content",
    );
    expect(twitterCard).toBe("summary_large_image");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toBe("https://dbastrosuite.com/tool/file-grouper");
  });

  test("should visually match the file-grouper baseline", async ({ page }) => {
    await expect(page).toHaveScreenshot("file-grouper-tool.png", {
      fullPage: true,
      threshold: 0.2,
      timeout: 15000,
    });
  });
});

test.describe("Hub tool demo lightbox", () => {
  // BLOCKER: the file-grouper page currently has no demo lightbox —
  // only astrogram and starwizz do. Lightbox coverage is therefore
  // scoped to those two tools.
  const tools: ReadonlyArray<{
    slug: "astrogram" | "starwizz";
    demoAlt: string;
  }> = [
    { slug: "astrogram", demoAlt: "Astrogram Demo" },
    { slug: "starwizz", demoAlt: "Starwizz Demo" },
  ];

  for (const tool of tools) {
    test(`should open and close the ${tool.slug} demo lightbox via the close button`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.demoAlt);
      await expect(hubTool.getLightbox()).toBeVisible();
      await hubTool.closeDemoLightbox();
      await expect(hubTool.getLightbox()).toBeHidden();
    });

    test(`should close the ${tool.slug} demo lightbox when ESC is pressed`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.demoAlt);
      await hubTool.closeDemoLightboxByEscape();
      await expect(hubTool.getLightbox()).toBeHidden();
    });

    test(`should close the ${tool.slug} demo lightbox when the backdrop is clicked`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.demoAlt);
      await hubTool.closeDemoLightboxByBackdrop();
      await expect(hubTool.getLightbox()).toBeHidden();
    });
  }
});
