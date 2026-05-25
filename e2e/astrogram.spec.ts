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
    // Stellar mode rail surfaces the stellar-only inspector items. The
    // "Selected Target" item is conditional on `hasSelectedAnnotation()`
    // and is not present until a marker is clicked, so we don't assert it
    // here.
    await expect(
      page.getByRole("button", { name: "Annotation filters", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Annotation style", exact: true }),
    ).toBeVisible();
    // With no background image picked yet, the upload prompt is rendered.
    await expect(astrogram.getStellarUploadHeading()).toBeVisible();
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

  test("should change the accent colour and apply it to the hero title", async ({
    page,
  }) => {
    await astrogram.setAccentColor("#ff6b3d");
    // The Direction B card uses `--accent-color` for `.pn-title` text
    // colour (the prior design used a hero border). Assert the dominant
    // red channel on the h1 inside the card hero.
    const titleColor = await page
      .getByTestId("card-hero")
      .getByRole("heading", { level: 1 })
      .evaluate((el) => getComputedStyle(el).color);
    expect(titleColor).toMatch(/(?:rgb\([^)]*255[^)]*\))|(?:srgb\s+1\b)/);
  });

  test("should open the Export panel from the rail and show format options", async ({
    page,
  }) => {
    await astrogram.openPanel("Export");
    // The Export panel renders three format radios under the "Output
    // format" inspector section and an in-panel "Export" CTA.
    await expect(page.getByText("Output format")).toBeVisible();
    await expect(astrogram.getExportPanelCta()).toBeVisible();
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
  // Each entry maps a rail label to a panel sub-heading that uniquely
  // identifies the mounted panel. The sub-headings come from
  // `<dba-ui-inspector-section sub="…">` on each panel template and are
  // chosen because they do NOT also appear in the rail short-labels — so
  // a page-wide getByText assertion is unambiguous.
  const panels = [
    { rail: "Object info" as const, headline: "Basic info about the object" },
    { rail: "Capture" as const, headline: "Light pollution at capture site" },
    { rail: "Equipment" as const, headline: "Hardware" },
    { rail: "Layout" as const, headline: "Card dimensions for export" },
    { rail: "Export" as const, headline: "Output format" },
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
