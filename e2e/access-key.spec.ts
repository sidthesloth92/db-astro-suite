import { expect, test } from "@playwright/test";
import path from "path";
import { AccessKeyModalPage } from "./pages/access-key-modal.page";
import { StellarMapPage } from "./pages/stellar-map.page";
import { ACCESS_KEY_STORAGE_KEY } from "../tools/astrogram/src/app/services/astrosolve.constants";

// Fixture image shipped with the project — used for upload tests.
const ROSETTE_IMAGE = path.resolve(
  __dirname,
  "../tools/astrogram/public/assets/img/rosette.jpg",
);

test.describe("Access Key Modal", () => {
  let stellarMapPage: StellarMapPage;
  let accessKeyModalPage: AccessKeyModalPage;

  test.beforeEach(async ({ page }) => {
    stellarMapPage = new StellarMapPage(page);
    accessKeyModalPage = new AccessKeyModalPage(page);
    await stellarMapPage.navigate();
    await page.evaluate(() => localStorage.clear());
  });

  /**
   * Switches to Stellar Map mode, uploads an image to enable ASTROSOLVE,
   * then clicks ASTROSOLVE to trigger the access key modal.
   * Re-uses the outer `stellarMapPage` closed over from beforeEach.
   */
  async function triggerModal(): Promise<void> {
    await stellarMapPage.switchToStellarMapMode();
    await stellarMapPage.uploadImage(ROSETTE_IMAGE);
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible({
      timeout: 5000,
    });
    await stellarMapPage.getAstrosolveButton().click();
  }

  test("modal appears when ASTROSOLVE is clicked with no stored key", async () => {
    await triggerModal();
    await expect(accessKeyModalPage.getModal()).toBeVisible();
  });

  test("entering a valid key stores it and dismisses the modal", async ({
    page,
  }) => {
    const testKey = "test-access-key-123";

    // Mock the solve endpoint so it never returns 401 (which would clear the key).
    // A 503 triggers the non-401 error path — key stays in storage.
    await page.route("**/api/v1/solve", (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ code: "UNAVAILABLE", message: "mocked", details: {} }) }),
    );

    await triggerModal();
    await expect(accessKeyModalPage.getModal()).toBeVisible();

    // The modal opens in the CTA view by default; switch to the key-entry
    // view before interacting with the input + submit button.
    await accessKeyModalPage.switchToKeyEntry();
    await accessKeyModalPage.typeKey(testKey);
    await accessKeyModalPage.submit();

    await expect(accessKeyModalPage.getModal()).not.toBeVisible();

    // Persistence happens asynchronously inside the solve catch path
    // (the modal closes optimistically when SUBMIT is emitted, then the
    // 503 mock round-trips, then the non-AccessKeyError branch in
    // annotation-controls.ts persists pendingKey). Poll up to the default
    // expect timeout so we don't race that async path.
    await expect
      .poll(() =>
        page.evaluate(
          (key: string) => localStorage.getItem(key),
          ACCESS_KEY_STORAGE_KEY,
        ),
      )
      .toBe(testKey);
  });

  test("cancelling the modal hides it without storing a key", async ({
    page,
  }) => {
    await triggerModal();
    await expect(accessKeyModalPage.getModal()).toBeVisible();

    await accessKeyModalPage.close();

    await expect(accessKeyModalPage.getModal()).not.toBeVisible();

    const storedKey = await page.evaluate(
      (key: string) => localStorage.getItem(key),
      ACCESS_KEY_STORAGE_KEY,
    );
    expect(storedKey).toBeNull();
  });

  test("key persists across page reloads — modal does not appear when key is already stored", async ({
    page,
  }) => {
    // Mock solve so it succeeds (non-401) — prevents key being cleared and modal re-appearing.
    await page.route("**/api/v1/solve", (route) =>
      route.abort(),
    );

    // beforeEach cleared localStorage; now store a key before the next navigation
    await page.evaluate(
      ([storageKey, value]) => localStorage.setItem(storageKey, value),
      [ACCESS_KEY_STORAGE_KEY, "persisted-key-456"],
    );

    // Reload so Angular re-reads localStorage at startup
    await stellarMapPage.navigate();

    await stellarMapPage.switchToStellarMapMode();
    await stellarMapPage.uploadImage(ROSETTE_IMAGE);
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible({
      timeout: 5000,
    });
    await stellarMapPage.getAstrosolveButton().click();

    // Modal must NOT appear — the stored key is picked up automatically
    await expect(accessKeyModalPage.getModal()).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("Submit button is disabled when input is empty and enabled once a value is typed", async () => {
    await triggerModal();
    await expect(accessKeyModalPage.getModal()).toBeVisible();

    // Switch from the default CTA view to the key-entry view, where the
    // input and SUBMIT button actually live.
    await accessKeyModalPage.switchToKeyEntry();
    await expect(accessKeyModalPage.getSubmitButton()).toBeDisabled();

    await accessKeyModalPage.typeKey("a");
    await expect(accessKeyModalPage.getSubmitButton()).toBeEnabled();
  });
});
