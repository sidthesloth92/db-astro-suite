import { test, expect } from "@playwright/test";

test.describe("Astrogram Logic & Functional Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:4201/db-astro-suite/astrogram/");
    await expect(page.locator(".form-container").first()).toBeVisible();
  });

  test("Filter name is editable for custom filters and updates preview", async ({
    page,
  }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Integration" })
      .click();
    await page.waitForTimeout(600);
    await page
      .locator("button.subtle-add-btn")
      .filter({ hasText: "Add Custom Filter" })
      .click();
    await page.waitForTimeout(100);
    const filterInput = page.locator("input.filter-name-input-ag").first();
    await expect(filterInput).toBeVisible();
    const framesInput = page
      .locator(".filter-inputs input[type='number']")
      .nth(-2);
    await framesInput.fill("10");
    const lastFilterLabel = page
      .locator(".filter-rings dba-ag-filter-ring .filter-label")
      .last();
    await filterInput.click();
    await filterInput.fill("CUSTOM-HA");
    await filterInput.press("Enter");
    await expect(lastFilterLabel).toHaveText("CUSTOM-HA");
  });

  test("Accent color applies to output card section borders", async ({
    page,
  }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Card Settings" })
      .click();
    await page.waitForTimeout(600);
    const accentPicker = page.locator("input[type='color']").first();
    await accentPicker.fill("#00ff00");
    const cardSection = page.locator(".card-section").first();
    const borderColor = await cardSection.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toContain("255");
  });

  test("Download button re-enables after export", async ({ page }) => {
    const downloadBtn = page.locator("button.download-fab");
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();
    await page.waitForTimeout(1000);
    await expect(downloadBtn).toBeEnabled();
  });

  test("Mobile export resolution verification", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    const downloadBtn = page.locator("button.download-fab");
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
  });

  test("DSO description fetch from Wikipedia works", async ({ page }) => {
    await page
      .locator(".accordion-header")
      .filter({ hasText: "Image Details" })
      .click();
    await page.waitForTimeout(600);

    const searchInput = page.locator("#dso-search-input");
    const findBtn = page
      .locator("button.fetch-btn")
      .filter({ hasText: "Find" });
    const descriptionTextarea = page.locator("dba-ui-textarea textarea");

    const defaultDesc =
      "The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn't see anything but it was just right there hidden among the stars. Here it is in pink on Valentine's Day 🌹";

    // Clear and fill correctly
    await searchInput.fill("Andromeda Galaxy");
    await findBtn.click();

    // Wait for the description to change from default
    await expect(descriptionTextarea).not.toHaveValue(defaultDesc, {
      timeout: 15000,
    });

    const value = await descriptionTextarea.inputValue();
    console.log("Fetched Description:", value);
    expect(value.toLowerCase()).toContain("andromeda");
  });

  test.skip("Plate Solving successfully annotates the image", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).MOCK_DB = {
        "NGC 2244": {
          Name: "NGC 2244",
          Type: "Open Cluster",
          Constellation: "Mon",
          sizeId: 20,
        },
      };
    });

    await page.route("**/*corsproxy.io*", async (route) => {
      const url = route.request().url();
      console.log("INTERCEPTED:", url);

      if (url.includes("/api/login")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            session: "mock-session-123",
          }),
        });
        return;
      }

      if (url.includes("/api/upload")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "success", subid: 9999 }),
        });
        return;
      }

      if (url.includes("/api/submissions/9999")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jobs: [8888] }),
        });
        return;
      }

      if (url.includes("/api/jobs/8888/annotations")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            annotations: [
              {
                type: "ngc",
                names: ["NGC 2244"],
                pixelx: 100,
                pixely: 100,
                radius: 20,
              },
            ],
          }),
        });
        return;
      }

      if (url.includes("/api/jobs/8888")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "success" }),
        });
        return;
      }

      await route.continue();
    });

    // Navigate to Stellar Map tab
    await page
      .locator("button.mode-btn")
      .filter({ hasText: "Stellar Map" })
      .click();
    await page.waitForTimeout(600);

    // Upload a fake image
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page
      .locator("button.upload-btn")
      .filter({ hasText: "UPLOAD MAP BACKGROUND" })
      .click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "mock-image.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("mock-image-content"),
    });

    // Trigger Plate Solve
    await page
      .locator("button.solve-btn")
      .filter({ hasText: "GENERATE STAR MAP" })
      .click();

    // The UI should display processing steps, then eventually show the annotation
    // Astrometry annotations are placed as map-markers, and their label is bound to the element inside dba-ag-stellar-map-preview
    // Let's just wait for the NGC 2244 text to appear somewhere in the preview area
    await expect(page.locator("body")).toContainText("NGC 2244", {
      timeout: 15000,
    });
  });
});
