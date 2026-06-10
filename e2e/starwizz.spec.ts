import { expect, test } from "@playwright/test";
import path from "path";
import { StarwizzPage } from "./pages/starwizz.page";

/** Fixture image shipped with the starwizz public bundle. */
const STARWIZZ_FIXTURE_IMAGE = path.resolve(
  __dirname,
  "../tools/starwizz/public/Chrismas_Tree_HOO_16_9_full.jpg",
);

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

  await expect(page).toHaveTitle("Starwizz - 4K Starfield Video Generator");

  const ogTitle = await page.getAttribute(
    'meta[property="og:title"]',
    "content",
  );
  expect(ogTitle).toBe("Starwizz - 4K Starfield Video Generator");

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

  const twitterSite = await page.getAttribute(
    'meta[name="twitter:site"]',
    "content",
  );
  expect(twitterSite).toBe("@sidthesloth92");

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

test.describe("Starwizz simulator flow", () => {
  let starwizz: StarwizzPage;

  test.beforeEach(async ({ page }) => {
    starwizz = new StarwizzPage(page);
    await starwizz.navigate();
  });

  test("should hide the upload overlay and show the Clear button after upload", async () => {
    // Default-image autoload may already show the canvas; uploading
    // explicitly is the user-driven path we care about.
    await starwizz.uploadImage(STARWIZZ_FIXTURE_IMAGE);
    // Clear button is only mounted when an image is loaded.
    await expect(starwizz.getClearButton()).toBeVisible({ timeout: 10000 });
    await expect(starwizz.getUploadOverlayHeading()).toBeHidden();
  });

  test("should return to the upload overlay after Clear", async () => {
    await starwizz.uploadImage(STARWIZZ_FIXTURE_IMAGE);
    await expect(starwizz.getClearButton()).toBeVisible({ timeout: 10000 });
    await starwizz.clearImage();
    // Upload overlay heading re-mounts.
    await expect(starwizz.getUploadOverlayHeading()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should reflect a slider change in the corresponding readout", async () => {
    await starwizz.uploadImage(STARWIZZ_FIXTURE_IMAGE);
    await expect(starwizz.getClearButton()).toBeVisible({ timeout: 10000 });

    const before = await starwizz.getControlReadout("Zoom Speed");
    await starwizz.setControlValue("Zoom Speed", 2.5);
    await expect
      .poll(async () => starwizz.getControlReadout("Zoom Speed"))
      .not.toBe(before);
  });
});

test("Starwizz control panel visual baseline", async ({ page }) => {
  const starwizz = new StarwizzPage(page);
  await starwizz.navigate();
  // Mask the WebGL canvas — randomly generated stars would fail any
  // pixel-to-pixel comparison.
  await expect(page).toHaveScreenshot("starwizz-control-panel.png", {
    mask: [starwizz.getCanvas()],
    fullPage: true,
    threshold: 0.2,
    timeout: 15000,
  });
});
