import { expect, test } from "@playwright/test";
import path from "path";
import { StellarMapPage } from "./pages/stellar-map.page";

// Fixture image shipped with the project — used for upload tests.
const ROSETTE_IMAGE = path.resolve(
  __dirname,
  "../tools/astrogram/public/assets/img/rosette.jpg",
);

test.describe("Stellar Map — Draggable Annotation Markers", () => {
  let stellarMapPage: StellarMapPage;

  test.beforeEach(async ({ page }) => {
    stellarMapPage = new StellarMapPage(page);
    await stellarMapPage.navigate();
    await stellarMapPage.switchToStellarMapMode();
    await stellarMapPage.uploadImage(ROSETTE_IMAGE);
    // Wait for the upload card to disappear, confirming the image is loaded
    await expect(stellarMapPage.getUploadTargetHeading()).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("add annotation button appears after image upload", async () => {
    await expect(stellarMapPage.getAddAnnotationButton()).toBeVisible();
  });

  test("clicking add annotation adds a marker to the preview", async () => {
    await stellarMapPage.addCustomAnnotation();
    await expect(stellarMapPage.getAnnotationMarkers()).toHaveCount(1);
  });

  test("dragging an annotation marker repositions it", async () => {
    await stellarMapPage.addCustomAnnotation();

    const marker = stellarMapPage.getFirstAnnotationMarker();
    const initialBox = await marker.boundingBox();
    expect(initialBox).not.toBeNull();

    // Safe to use non-null assertion here — guarded by the expect above
    const oldCx = initialBox!.x + initialBox!.width / 2;
    const oldCy = initialBox!.y + initialBox!.height / 2;

    await stellarMapPage.dragAnnotationBy(marker, 80, 60);

    const newBox = await marker.boundingBox();
    expect(newBox).not.toBeNull();

    const newCx = newBox!.x + newBox!.width / 2;
    const newCy = newBox!.y + newBox!.height / 2;

    // Allow ±15 px tolerance to account for sub-pixel rounding in percent-based
    // positioning. The component converts pixel deltas to percentage offsets
    // relative to the container width/height.
    expect(Math.abs(newCx - (oldCx + 80))).toBeLessThan(15);
    expect(Math.abs(newCy - (oldCy + 60))).toBeLessThan(15);
  });

  test("clicking an annotation marker (no drag) selects it", async ({
    page,
  }) => {
    await stellarMapPage.addCustomAnnotation();

    const marker = stellarMapPage.getFirstAnnotationMarker();
    await marker.waitFor({ state: "visible" });

    const box = await marker.boundingBox();
    expect(box).not.toBeNull();

    // Perform a precise 0-delta click (mousedown + mouseup at the identical
    // point) so the component's <3 px threshold treats it as a click, not a
    // drag, and fires the selection toggle.
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.up();

    await expect(marker).toHaveClass(/selected/);
  });
});
