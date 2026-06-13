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
    await expect(hubTool.getSectionHeading(/Why Astrogram/i)).toBeVisible();
    await expect(hubTool.getSectionHeading("FEATURES")).toBeVisible();
    await expect(hubTool.getSectionHeading("HOW IT WORKS")).toBeVisible();
    await expect(hubTool.getSectionHeading(/OUTPUT/i)).toBeVisible();
  });

  test("lists nine capabilities and four steps", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(9);
    await expect(hubTool.getStepHeadings()).toHaveCount(4);
  });

  test("exposes the launch CTA and demo preview", async () => {
    await expect(hubTool.getPrimaryCta(/Launch Astrogram/i)).toHaveAttribute(
      "href",
      "/astrogram/",
    );
    await expect(
      hubTool.getDemoImage(
        "Astrogram plate-solved Stellar Map with labelled objects and light-year distances",
      ),
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
    await expect(hubTool.getSectionHeading(/Why Starwizz/i)).toBeVisible();
    await expect(hubTool.getSectionHeading("FEATURES")).toBeVisible();
    await expect(hubTool.getSectionHeading("HOW IT WORKS")).toBeVisible();
    await expect(hubTool.getSectionHeading(/OUTPUT/i)).toBeVisible();
  });

  test("lists nine capabilities and five steps", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(9);
    await expect(hubTool.getStepHeadings()).toHaveCount(5);
  });

  test("exposes the launch CTA and the demo video", async () => {
    await expect(hubTool.getPrimaryCta(/Launch Starwizz/i)).toHaveAttribute(
      "href",
      "/starwizz/",
    );
    await expect(
      hubTool.getDemoVideo("Starwizz cinematic starfield demo"),
    ).toBeVisible();
  });
});

test.describe("Sortronomy Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("sortronomy");
  });

  test("renders the sortronomy hero heading and overview", async ({
    page,
  }) => {
    await expect(hubTool.getHeroHeading()).toContainText("SORTRONOMY");
    await expect(hubTool.getSectionHeading(/What Sortronomy is/i)).toBeVisible();
    await expect(
      page.getByText("Sortronomy is a command-line wizard", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test("should render exactly six feature items", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(6);
  });

  test("emphasises that it runs fully offline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Fully offline" }),
    ).toBeVisible();
  });

  test("opens an OS-specific install dialog from the Install step", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Install/i }).first().click();
    const dialog = page.getByRole("dialog", { name: "Install Sortronomy" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("brew install --cask sidthesloth92/tap/sortronomy"),
    ).toBeVisible();
    await dialog.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("exposes the access-repository CTA", async () => {
    await expect(hubTool.getPrimaryCta(/Access Repository/i)).toHaveAttribute(
      "href",
      /github\.com.*sortronomy/,
    );
  });

  test("should expose the canonical, og, and twitter SEO meta tags", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(
      "Sortronomy - Organise Your FITS Captures Offline",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Sortronomy - Organize Your FITS Captures Offline");

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
    expect(canonical).toBe("https://dbastrosuite.com/tool/sortronomy");
  });

  test("should visually match the sortronomy baseline", async ({ page }) => {
    await expect(page).toHaveScreenshot("sortronomy-tool.png", {
      fullPage: true,
      threshold: 0.2,
      timeout: 15000,
    });
  });
});

test.describe("Hub tool demo lightbox", () => {
  // Only the astrogram output pair uses expandable images. Starwizz embeds a
  // video demo and the sortronomy page uses CLI terminal blocks, so neither has
  // a lightbox — coverage is scoped to astrogram.
  const tools: ReadonlyArray<{
    slug: "astrogram";
    expandButton: string;
    lightbox: string;
  }> = [
    {
      slug: "astrogram",
      expandButton: "Expand the plate-solved annotated image",
      lightbox:
        "Astrogram plate-solved annotated image with labelled objects and light-year distances",
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
