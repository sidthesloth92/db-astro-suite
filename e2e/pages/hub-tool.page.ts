import { Locator, Page, expect } from "@playwright/test";

/** Hub tool slugs — map 1:1 to `/tool/<slug>` URLs. */
export type HubToolSlug = "astrogram" | "starwizz" | "file-grouper";

/**
 * Page Object shared by all three hub tool pages (`/tool/astrogram`,
 * `/tool/starwizz`, `/tool/file-grouper`). The pages share a layout
 * (`top-nav` + `overview-section` + `features-section` + optional demo
 * lightbox) so a single POM serves every per-page spec.
 *
 * Locators are semantic. Where the existing markup lacks an aria-label
 * (e.g. `.overview-section`, `.feature-item`), the test surface still
 * needs a stable handle so we expose the CSS class as a private locator
 * with a code-comment justification — never bubble it into specs.
 */
export class HubToolPage {
  constructor(private readonly page: Page) {}

  /**
   * Navigates to the tool page for the given slug and waits for the
   * overview section to render.
   */
  async navigate(slug: HubToolSlug): Promise<void> {
    await this.page.goto(`http://localhost:5173/tool/${slug}`);
    // Every tool page renders the tool name as an H1 — use it as the
    // "page is ready" sentinel rather than coupling to a section CSS
    // class that varies across pages.
    await expect(this.getHeroHeading()).toBeVisible();
  }

  /**
   * Returns the H1 heading for the current tool page. Hub tool pages
   * use the lowercase tool name as the H1 (`astrogram`, `starwizz`,
   * `file grouper`).
   */
  getHeroHeading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  /**
   * Returns the overview <section>. No semantic role exists for these
   * marketing sections, so the CSS class is the only stable handle.
   */
  getOverviewSection(): Locator {
    // Justification: hub tool pages render the overview as a bare
    // `<section class="overview-section">` with no aria-label and no
    // role; the CSS class is the only stable handle.
    return this.page.locator(".overview-section");
  }

  /**
   * Returns the features <section>.
   */
  getFeaturesSection(): Locator {
    return this.page.locator(".features-section");
  }

  /**
   * Returns every rendered `.feature-item` for count-based assertions.
   * Justification: same as `.overview-section` — no role, no label.
   */
  getFeatureItems(): Locator {
    return this.page.locator(".feature-item");
  }

  /**
   * Returns every rendered `.specs-list li` row. The file-grouper page
   * lists features as a `<ul class="specs-list">` rather than the
   * `.feature-item` grid used by astrogram/starwizz; the row count is
   * still the user-facing contract.
   * Justification: same as `.feature-item` — no role, no label.
   */
  getSpecsListItems(): Locator {
    return this.page.locator(".specs-list li");
  }

  /**
   * Returns the rendered overview text as a single trimmed string.
   * Useful for asserting marketing copy without coupling to exact DOM
   * structure.
   */
  async getOverviewText(): Promise<string> {
    return (await this.getOverviewSection().innerText()).trim();
  }

  /**
   * Returns the demo image inside the tool page's `.demo-section`. The
   * image's `alt` attribute (`<Tool> Demo`) is the semantic handle.
   */
  getDemoImage(altText: string): Locator {
    return this.page.getByAltText(altText);
  }

  /**
   * Opens the demo lightbox by clicking the demo image. The lightbox
   * itself is `role="dialog" aria-label="Demo preview"`.
   */
  async openDemoLightbox(altText: string): Promise<void> {
    await this.getDemoImage(altText).click();
    await expect(this.getLightbox()).toBeVisible();
  }

  /**
   * Closes the demo lightbox via its dedicated close button. Falls
   * back to the dialog's escape key handler if the button is hidden.
   */
  async closeDemoLightbox(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
  }

  /**
   * Closes the demo lightbox by clicking the backdrop. The dialog
   * registers a click handler on the outer container that closes
   * itself unless the click is on the inner image.
   */
  async closeDemoLightboxByBackdrop(): Promise<void> {
    const dialog = this.getLightbox();
    const box = await dialog.boundingBox();
    if (!box) {
      throw new Error("Lightbox dialog is not laid out — cannot click backdrop");
    }
    // Click a corner pixel that's guaranteed to be on the backdrop
    // and not on the inner image.
    await this.page.mouse.click(box.x + 4, box.y + 4);
  }

  /**
   * Closes the demo lightbox via the ESC key. The dialog registers
   * `(keydown.escape)="closeLightbox()"` and `tabindex="-1"` so the
   * focus is on the dialog after open.
   */
  async closeDemoLightboxByEscape(): Promise<void> {
    await this.getLightbox().press("Escape");
  }

  /** Returns the lightbox dialog locator (role=dialog, aria-label=Demo preview). */
  getLightbox(): Locator {
    return this.page.getByRole("dialog", { name: "Demo preview" });
  }

  /** True when the lightbox dialog is currently visible. */
  async isLightboxOpen(): Promise<boolean> {
    return this.getLightbox().isVisible();
  }
}
