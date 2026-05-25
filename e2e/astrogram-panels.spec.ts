import { expect, test } from "@playwright/test";
import { AstrogramDesktopPage } from "./pages/astrogram-desktop.page";
import { StellarMapPage } from "./pages/stellar-map.page";

/**
 * Behavioural coverage for the redesigned inspector panels. Visual
 * snapshots are scaffolded at the end of each block — first CI run
 * lands the baselines.
 *
 * BLOCKERS (see test-engineer report): the Layout panel no longer
 * exposes a density or hide-author toggle; the Annotation-style panel
 * has no Reset button; equipment-row value inputs lack an aria-label;
 * the Style panel has been merged into Layout. Those flows are not
 * covered here — they are filed for handoff to frontend-dev.
 */
test.describe("Astrogram Equipment panel", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page, context }) => {
    // Preset persistence rides on localStorage — clear it once per test
    // so isolation is preserved when this spec runs alongside others.
    await context.clearCookies();
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(astrogram.getDesktopShellMount()).toBeVisible();
  });

  test("should persist a saved equipment preset across page reloads", async ({
    page,
  }) => {
    await astrogram.openEquipmentPanel();
    const presetLabel = "Test rig alpha";
    await astrogram.saveEquipmentPreset(presetLabel);

    // Preset row should appear immediately after save. The load button's
    // accessible name combines the preset name with its equipment summary,
    // so we match by substring.
    await expect(
      page.getByRole("button", { name: new RegExp(presetLabel) }).first(),
    ).toBeVisible();

    // Reload — preset should survive (PresetService persists via localStorage).
    await page.reload();
    await expect(astrogram.getDesktopShellMount()).toBeVisible();
    await astrogram.openEquipmentPanel();
    // Wait for the saved-preset row to mount before reading labels —
    // panel content is OnPush and may not flush in the same tick as
    // the rail-item click resolves.
    await expect(
      page.getByRole("button", { name: new RegExp(presetLabel) }).first(),
    ).toBeVisible();
    const labels = await astrogram.getEquipmentPresetLabels();
    expect(labels).toContain(presetLabel);
  });

  test("should activate a saved preset and mark it as the active row", async ({
    page,
  }) => {
    await astrogram.openEquipmentPanel();
    const presetLabel = "Preset to activate";
    await astrogram.saveEquipmentPreset(presetLabel);
    await astrogram.applyEquipmentPreset(presetLabel);

    // Active state is surfaced as `aria-pressed="true"` on the loader button.
    const loadButton = page
      .getByRole("button", { name: new RegExp(presetLabel) })
      .first();
    await expect(loadButton).toHaveAttribute("aria-pressed", "true");
  });

  test("should visually match the populated Equipment panel baseline", async ({
    page,
  }) => {
    await astrogram.openEquipmentPanel();
    await astrogram.saveEquipmentPreset("Snapshot rig");
    await expect(page).toHaveScreenshot("desktop-equipment.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

test.describe("Astrogram Layout panel", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
  });

  test("should expose both a primary and a secondary accent swatch in the Layout panel", async ({
    page,
  }) => {
    await astrogram.openLayoutPanel();
    await expect(
      page.getByLabel("Accent colour", { exact: true }),
    ).toBeAttached();
    await expect(
      page.getByLabel("Secondary accent colour", { exact: true }),
    ).toBeAttached();
  });

  test("should propagate the secondary accent without changing the primary card hero border", async () => {
    await astrogram.openLayoutPanel();
    const beforeBorder = await astrogram.getCardHeroBorderColor();
    await astrogram.setSecondaryAccent("#22d3ee");
    const afterBorder = await astrogram.getCardHeroBorderColor();
    // The secondary accent drives the OIII ring stroke only; the hero
    // border is fed by the primary accent and must stay put.
    expect(afterBorder).toBe(beforeBorder);
  });

  test("should visually match the Layout panel baseline", async ({ page }) => {
    await astrogram.openLayoutPanel();
    await expect(page).toHaveScreenshot("desktop-layout.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

test.describe("Astrogram Capture panel", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
  });

  test("should update the card integration total after editing seconds-per-frame", async () => {
    const before = await astrogram.getIntegrationTotalFromCard();
    await astrogram.openCapturePanel();
    // OIII is enabled by default — bumping its seconds-per-frame must
    // change the caption total.
    await astrogram.setSecondsPerFrame("OIII", 600);
    await expect
      .poll(async () => astrogram.getIntegrationTotalFromCard())
      .not.toBe(before);
  });

  test("should update the card integration total after toggling a filter", async () => {
    const before = await astrogram.getIntegrationTotalFromCard();
    await astrogram.toggleFilter("OIII");
    await expect
      .poll(async () => astrogram.getIntegrationTotalFromCard())
      .not.toBe(before);
  });
});

test.describe("Stellar mode Annotation panels", () => {
  let stellar: StellarMapPage;

  test.beforeEach(async ({ page }) => {
    stellar = new StellarMapPage(page);
    await stellar.navigate();
    await stellar.switchToStellarMapMode();
  });

  test("should open the Annotation style panel from the stellar rail", async ({
    page,
  }) => {
    await stellar.openAnnotationStylePanel();
    // The panel renders two inspector-section titles: "Circle" and "Label".
    await expect(page.getByText("Circle", { exact: true })).toBeVisible();
    await expect(page.getByText("Label", { exact: true })).toBeVisible();
  });

  test("should visually match the Annotation style panel baseline", async ({
    page,
  }) => {
    await stellar.openAnnotationStylePanel();
    await expect(page).toHaveScreenshot("desktop-annotation-style.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("should surface the empty state when no annotation is selected", async ({
    page,
  }) => {
    // The "Selected Target" rail item is hidden until at least one
    // annotation is selected — the panel itself is reachable only after
    // selection. With no upload + no annotation, the rail item should
    // not exist.
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: "Selected Target", exact: true }),
    ).toHaveCount(0);
  });
});
