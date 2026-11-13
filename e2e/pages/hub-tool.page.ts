import { Locator, Page, expect } from "@playwright/test";

/** Hub tool slugs — map 1:1 to `/tool/<slug>` URLs. */
export type HubToolSlug =
  | "astrogram"
  | "starwizz"
  | "astrospike"
  | "sortronomy";

/**
 * Page Object for the hub tool detail pages (`/tool/<slug>`). They share
 * one config-driven layout (top-nav → hero → stats → about → what-it-does →
 * how-it-works → output → closing CTA), so a single POM serves every per-page
 * spec.
 *
 * Locators are semantic (roles + accessible names). The heading hierarchy
 * carries the structure: the tool title is the only `<h1>`, section titles are
 * `<h2>`, feature names are `<h3>`, and step titles are `<h4>` — so counts come
 * from roles rather than CSS classes.
 */
export class HubToolPage {
  constructor(private readonly page: Page) {}

  /** Navigates to the tool page and waits for its `<h1>` title to render. */
  async navigate(slug: HubToolSlug): Promise<void> {
    await this.page.goto(`http://localhost:5173/tool/${slug}`);
    await expect(this.getHeroHeading()).toBeVisible();
  }

  /** The single `<h1>` tool title (e.g. "ASTROGRAM", "SORTRONOMY"). */
  getHeroHeading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  /** A section `<h2>` heading by its (normalised) accessible name. */
  getSectionHeading(name: string | RegExp): Locator {
    return this.page.getByRole("heading", { level: 2, name });
  }

  /**
   * Every feature-card title (`<h3>`) — the "what it does" grid contract.
   * Scoped to the feature `<article>` cards so it excludes any other `<h3>`
   * a tool page may project into the output section (e.g. Astrogram's
   * "Plate Solving" / "Infographic" output-pair titles).
   */
  getFeatureHeadings(): Locator {
    return this.page.getByRole("article").getByRole("heading", { level: 3 });
  }

  /** Every "how it works" step title (`<h4>`). */
  getStepHeadings(): Locator {
    return this.page.getByRole("heading", { level: 4 });
  }

  /** The hero primary CTA link ("Launch …" / "Access Repository") by name. */
  getPrimaryCta(name: string | RegExp): Locator {
    return this.page.getByRole("link", { name }).first();
  }

  /** Switches the inline install command to the given OS (Sortronomy). */
  async selectInstallOs(name: "macOS" | "Windows" | "Linux"): Promise<void> {
    await this.page.getByRole("tab", { name }).click();
  }

  /** The visible install/run command text in the how-it-works section. */
  getCommandText(text: string): Locator {
    return this.page.getByText(text, { exact: false });
  }

  /** The "releases page" manual-install link in the install step (Sortronomy). */
  getReleasesLink(): Locator {
    return this.page.getByRole("link", { name: "releases page" });
  }

  /** A demo image by its `alt` text. */
  getDemoImage(altText: string): Locator {
    return this.page.getByAltText(altText);
  }

  /**
   * A demo video by its accessible label. The preview and output frames share
   * one label, so callers get the first match (the hero preview frame).
   */
  getDemoVideo(label: string): Locator {
    return this.page.getByLabel(label).first();
  }

  /** Opens the demo lightbox via the "Expand …" button over the output media. */
  async openDemoLightbox(
    expandButtonName: string,
    lightboxName: string,
  ): Promise<void> {
    await this.page
      .getByRole("button", { name: expandButtonName, exact: true })
      .click();
    await expect(this.getLightbox(lightboxName)).toBeVisible();
  }

  /** Closes the lightbox via its dedicated close button. */
  async closeDemoLightbox(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
  }

  /** Closes the lightbox by clicking a backdrop corner (not the inner image). */
  async closeDemoLightboxByBackdrop(lightboxName: string): Promise<void> {
    const box = await this.getLightbox(lightboxName).boundingBox();
    if (!box) {
      throw new Error(
        "Lightbox dialog is not laid out — cannot click backdrop",
      );
    }
    await this.page.mouse.click(box.x + 4, box.y + 4);
  }

  /** Closes the lightbox via the ESC key (the dialog is focused on open). */
  async closeDemoLightboxByEscape(lightboxName: string): Promise<void> {
    await this.getLightbox(lightboxName).press("Escape");
  }

  /** The lightbox dialog (`role="dialog"`), named per tool. */
  getLightbox(name: string): Locator {
    return this.page.getByRole("dialog", { name });
  }
}
