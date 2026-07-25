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
      page.getByText("Sortronomy is a small command-line wizard", {
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

  test("should render the three inline how-it-works steps", async () => {
    await expect(hubTool.getStepHeadings()).toHaveCount(3);
    await expect(
      hubTool.getStepHeadings().filter({ hasText: "Install the CLI" }),
    ).toBeVisible();
  });

  test("should show the install command inline and switch it per OS tab", async () => {
    // Playwright's Desktop Chrome device pins a Windows user agent, so the
    // page's OS detection lands on the Windows tab first — assert that
    // default, then walk the other tabs.
    await expect(
      hubTool.getCommandText("irm https://raw.githubusercontent.com"),
    ).toBeVisible();
    await expect(hubTool.getCommandText("Run it in PowerShell")).toBeVisible();

    await hubTool.selectInstallOs("macOS");
    await expect(
      hubTool.getCommandText("curl -fsSL https://raw.githubusercontent.com"),
    ).toBeVisible();

    await hubTool.selectInstallOs("Windows");
    await expect(
      hubTool.getCommandText("irm https://raw.githubusercontent.com"),
    ).toBeVisible();
  });

  test("should link to the releases page for manual installs", async () => {
    await expect(hubTool.getReleasesLink()).toHaveAttribute(
      "href",
      "https://github.com/sidthesloth92/db-astro-suite/releases?q=sortronomy",
    );
  });

  test("exposes the access-repository CTA and the demo video", async () => {
    await expect(hubTool.getPrimaryCta(/Access Repository/i)).toHaveAttribute(
      "href",
      /github\.com.*sortronomy/,
    );
    await expect(
      hubTool.getDemoVideo(
        "Sortronomy walkthrough demo: the wizard asks for folders and grouping options, then sorts a night's frames into the library",
      ),
    ).toBeVisible();
  });

  test("should expose the canonical, og, and twitter SEO meta tags", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(
      "Sortronomy - Organize Your FITS Captures Offline",
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

test.describe("Celestory Tool Page", () => {
  let hubTool: HubToolPage;

  test.beforeEach(async ({ page }) => {
    hubTool = new HubToolPage(page);
    await hubTool.navigate("celestory");
  });

  test("renders the celestory hero heading and overview", async ({ page }) => {
    await expect(hubTool.getHeroHeading()).toContainText("CELESTORY");
    await expect(hubTool.getSectionHeading(/What Celestory is/i)).toBeVisible();
    await expect(
      page.getByText("Celestory reads that history straight from your files", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test("should render exactly six feature items", async () => {
    await expect(hubTool.getFeatureHeadings()).toHaveCount(6);
  });

  test("should render the three how-it-works steps", async () => {
    await expect(hubTool.getStepHeadings()).toHaveCount(3);
    await expect(
      hubTool.getStepHeadings().filter({ hasText: "Install" }),
    ).toBeVisible();
  });

  test("should open the install dialog with the shipped curl and irm channels", async ({
    page,
  }) => {
    await hubTool.openInstallDialog("Install", "Install Celestory");

    await expect(
      hubTool.getCommandText(
        "curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/scripts/install.sh | sh",
      ).first(),
    ).toBeVisible();
    await expect(
      hubTool.getCommandText(
        "irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/scripts/install.ps1 | iex",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Package managers (Homebrew, winget, Scoop) are coming soon."),
    ).toBeVisible();
    await expect(hubTool.getReleasesLink()).toHaveAttribute(
      "href",
      "https://github.com/sidthesloth92/db-astro-suite/releases?q=celestory",
    );

    await hubTool.closeInstallDialog();
    await expect(
      hubTool.getInstallDialog("Install Celestory"),
    ).toBeHidden();
  });

  test("exposes the launch CTA and the demo placeholder", async ({ page }) => {
    await expect(hubTool.getPrimaryCta(/Launch Celestory/i)).toHaveAttribute(
      "href",
      "https://celestory.dbastrosuite.com",
    );
    await expect(
      page.getByText("Walkthrough demo coming soon"),
    ).toBeVisible();
  });

  test("should expose the canonical, og, and twitter SEO meta tags", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(
      "Celestory - Chart Your Astrophotography Journey",
    );

    const ogTitle = await page.getAttribute(
      'meta[property="og:title"]',
      "content",
    );
    expect(ogTitle).toBe("Celestory - Chart Your Astrophotography Journey");

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
    expect(canonical).toBe("https://dbastrosuite.com/tool/celestory");
  });

  test("should visually match the celestory baseline", async ({ page }) => {
    await expect(page).toHaveScreenshot("celestory-tool.png", {
      fullPage: true,
      threshold: 0.2,
      timeout: 15000,
    });
  });
});

test.describe("Hub tool demo lightbox", () => {
  // The sortronomy page uses ASCII before/after folder trees (no demo image
  // wired to a lightbox), and starwizz embeds a video demo, so lightbox
  // coverage stays scoped to astrogram.
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
