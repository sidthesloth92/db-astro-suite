import { expect, test } from "@playwright/test";
import { HubToolPage } from "./pages/hub-tool.page";

test.describe("Astrogram Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("astrogram");
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
    expect(twitterTitle).toBe("Astrogram Tool - Professional Exposure Cards");

    const twitterImage = await page.getAttribute(
      'meta[name="twitter:image"]',
      "content",
    );
    expect(twitterImage).toContain("og-astrogram.png");

    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    expect(canonical).toBe("https://dbastrosuite.com/tool/astrogram");
  });

  test("renders the uniform detail sections", async () => {
    await expect(hubTool.getHeroHeading()).toContainText("ASTROGRAM");
    await expect(hubTool.getSectionHeading(/What Astrogram is/i)).toBeVisible();
    await expect(hubTool.getSectionHeading("WHAT IT DOES")).toBeVisible();
    await expect(hubTool.getSectionHeading("HOW IT WORKS")).toBeVisible();
    await expect(hubTool.getSectionHeading(/The exposure card/i)).toBeVisible();
  });

  test("lists six capabilities and five steps", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(6);
    await expect(hubTool.getStepHeadings()).toHaveCount(5);
  });

  test("exposes the launch CTA and demo preview", async () => {
    await expect(hubTool.getPrimaryCta(/Launch Astrogram/i)).toHaveAttribute(
      "href",
      "/astrogram/",
    );
    await expect(
      hubTool.getDemoImage("Astrogram exposure card sample"),
    ).toBeVisible();
  });
});

test.describe("Starwizz Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("starwizz");
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

  test("renders the uniform detail sections", async () => {
    await expect(hubTool.getHeroHeading()).toContainText("STARWIZZ");
    await expect(hubTool.getSectionHeading(/What Starwizz is/i)).toBeVisible();
    await expect(hubTool.getSectionHeading("WHAT IT DOES")).toBeVisible();
    await expect(hubTool.getSectionHeading("HOW IT WORKS")).toBeVisible();
    await expect(hubTool.getSectionHeading(/The output/i)).toBeVisible();
  });

  test("lists six capabilities and five steps", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(6);
    await expect(hubTool.getStepHeadings()).toHaveCount(5);
  });

  test("exposes the launch CTA and demo preview", async () => {
    await expect(hubTool.getPrimaryCta(/Launch Starwizz/i)).toHaveAttribute(
      "href",
      "/starwizz/",
    );
    await expect(
      hubTool.getDemoImage("Starwizz starfield preview"),
    ).toBeVisible();
  });
});

test.describe("File Grouper Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("file-grouper");
  });

  test("renders the file-grouper hero heading and overview", async ({
    page,
  }) => {
    await expect(hubTool.getHeroHeading()).toContainText("FILE GROUPER");
    await expect(
      hubTool.getSectionHeading(/What File Grouper is/i),
    ).toBeVisible();
    await expect(
      page.getByText("File Grouper is a platform-agnostic", { exact: false }),
    ).toBeVisible();
  });

  test("should render exactly three feature items", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(3);
  });

  test("exposes the access-repository CTA", async () => {
    await expect(
      hubTool.getPrimaryCta(/Access Repository/i),
    ).toHaveAttribute("href", /github\.com.*file-grouper/);
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
  // The file-grouper page uses CLI terminal blocks (no demo image / lightbox),
  // so lightbox coverage is scoped to astrogram and starwizz.
  const tools: ReadonlyArray<{
    slug: "astrogram" | "starwizz";
    expandButton: string;
    lightbox: string;
  }> = [
    {
      slug: "astrogram",
      expandButton: "Expand the exposure card output",
      lightbox: "Exposure card preview",
    },
    {
      slug: "starwizz",
      expandButton: "Expand the starfield output",
      lightbox: "Starfield preview",
    },
  ];

  for (const tool of tools) {
    test(`should open and close the ${tool.slug} demo lightbox via the close button`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.expandButton, tool.lightbox);
      await expect(hubTool.getLightbox(tool.lightbox)).toBeVisible();
      await hubTool.closeDemoLightbox();
      await expect(hubTool.getLightbox(tool.lightbox)).toBeHidden();
    });

    test(`should close the ${tool.slug} demo lightbox when ESC is pressed`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.expandButton, tool.lightbox);
      await hubTool.closeDemoLightboxByEscape(tool.lightbox);
      await expect(hubTool.getLightbox(tool.lightbox)).toBeHidden();
    });

    test(`should close the ${tool.slug} demo lightbox when the backdrop is clicked`, async ({
      page,
    }) => {
      const hubTool = new HubToolPage(page);
      await hubTool.navigate(tool.slug);
      await hubTool.openDemoLightbox(tool.expandButton, tool.lightbox);
      await hubTool.closeDemoLightboxByBackdrop(tool.lightbox);
      await expect(hubTool.getLightbox(tool.lightbox)).toBeHidden();
    });
  }
});
