import { expect, test } from "@playwright/test";
import { AstrogramDesktopPage } from "./pages/astrogram-desktop.page";

/**
 * Desktop astrogram flows. The visual regression block was moved to
 * `e2e/astrogram-visual.spec.ts` so the snapshot policy can be enforced
 * independently and skipped locally via `--grep-invert "Visual regression"`.
 */
test.describe("Astrogram desktop", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page, context }) => {
    // Caption Copy test reads from navigator.clipboard — grant once at
    // the context level so every test in this block can use it without
    // needing per-test setup.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
  });

  test("should mount the desktop shell at 1400x900 viewport", async () => {
    await expect(astrogram.getDesktopShellMount()).toBeVisible();
  });

  test("should switch from Infographic to Stellar mode via the top-bar tabs", async ({
    page,
  }) => {
    await astrogram.switchToStellarMode();
    // Stellar mode rail surfaces the stellar-only inspector items.
    await expect(
      page.getByRole("button", { name: "Annotation filters", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Annotation style", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Selected annotation", exact: true }),
    ).toBeVisible();
    // With no background image picked yet, the upload card is rendered.
    await expect(astrogram.getCardHero()).not.toBeVisible();
  });

  test("should reflect the new object name in the card preview hero", async ({
    page,
  }) => {
    await astrogram.setObjectName("M31 Andromeda");
    // Card preview is OnPush; poll the rendered heading so the
    // assertion does not race the signal → OnPush change-detection
    // cycle under parallel load. Compare case-insensitively because
    // the hero title is uppercased via CSS `text-transform`.
    await expect
      .poll(async () => (await astrogram.getCardHeroText()).toLowerCase())
      .toContain("m31 andromeda");
  });

  test("should toggle a filter and update the integration total on the card", async () => {
    const before = await astrogram.getIntegrationTotalFromCard();
    // OIII is enabled by default — toggling it off must decrease the total.
    await astrogram.toggleFilter("OIII");
    await expect
      .poll(async () => astrogram.getIntegrationTotalFromCard())
      .not.toBe(before);
  });

  test("should change the accent colour and apply it to the hero border", async () => {
    await astrogram.setAccentColor("#ff6b3d");
    const borderColor = await astrogram.getCardHeroBorderColor();
    // Chromium can serialise computed border-color as either legacy
    // `rgb(255, 107, 61)` or modern `color(srgb 1 0.42 0.24 / 0.4)`.
    // Match the dominant red channel in either notation.
    expect(borderColor).toMatch(/(?:rgb\([^)]*255[^)]*\))|(?:srgb\s+1\b)/);
  });

  test("should open the Export panel from the rail and show format options", async ({
    page,
  }) => {
    await astrogram.openPanel("Export");
    // The Export panel surfaces three format radios + Export now CTA.
    await expect(page.getByText("Export options")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Export now/i }),
    ).toBeVisible();
  });

  test("should copy the caption to the clipboard with bulleted sections", async () => {
    const caption = await astrogram.copyCaption();
    // Caption is non-empty.
    expect(caption.length).toBeGreaterThan(0);
    // The caption-section renders block heads with emoji bullets — at
    // least one of these must be present in the clipboard payload.
    expect(caption).toMatch(/🔭|⏱️|💻/);
    // Equipment block surfaces the labelled rows.
    expect(caption).toMatch(/Telescope:/);
    // Hashtag tail is included.
    expect(caption).toMatch(/#/);
  });
});

test.describe("Astrogram inspector panels", () => {
  let astrogram: AstrogramDesktopPage;

  test.beforeEach(async ({ page }) => {
    astrogram = new AstrogramDesktopPage(page);
    await astrogram.navigate();
  });

  // The inspector rail entries — each maps a rail label to a panel
  // headline that must appear once opened. Behavioural assertion only,
  // no snapshots (those live in astrogram-visual.spec.ts).
  const panels = [
    { rail: "Object info" as const, headline: "Identification" },
    { rail: "Capture" as const, headline: "Filter integration" },
    { rail: "Equipment" as const, headline: "Rig presets" },
    { rail: "Style" as const, headline: "Format" },
    { rail: "Export" as const, headline: "Export options" },
  ];

  for (const panel of panels) {
    test(`should open the ${panel.rail} panel from the inspector rail`, async ({
      page,
    }) => {
      await astrogram.openPanel(panel.rail);
      await expect(page.getByText(panel.headline)).toBeVisible();
    });
  }
});
