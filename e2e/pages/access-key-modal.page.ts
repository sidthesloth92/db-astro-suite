import { Locator, Page } from "@playwright/test";

/**
 * Page object for the two-view Astro Solve access-key modal:
 *
 *  1. "Gate/CTA" view (shown by default):
 *     - Heading: "Wanna try Astro Solve?"
 *     - Buttons: "DM on Instagram", "Already have a key? ›", close (X)
 *  2. "Key-entry" view (shown after clicking "Already have a key? ›"
 *     OR automatically when the modal opens with showError=true):
 *     - Heading: "Enter your access key"
 *     - Access key input + "Back" + "Unlock solver" buttons
 *
 * `getModal()` anchors on the dialog container so it works in both
 * views — heading text changes per view, so the heading isn't a stable
 * "is the modal open" indicator.
 */
export class AccessKeyModalPage {
  constructor(private readonly page: Page) {}

  /** Dialog container — present regardless of which view is showing. */
  getModal(): Locator {
    return this.page.getByRole("dialog");
  }

  /** Heading shown in the default gate/CTA view. */
  getCtaHeading(): Locator {
    return this.page.getByRole("heading", { name: /Wanna try Astro Solve/i });
  }

  /** Heading shown after switching to the key-entry view. */
  getKeyEntryHeading(): Locator {
    return this.page.getByRole("heading", { name: /Enter your access key/i });
  }

  /**
   * The access key input. Only present in the key-entry view. `exact: true`
   * because the dialog's accessible name ("Enter your access key") also
   * contains "access key".
   */
  getInput(): Locator {
    return this.page.getByLabel("Access Key", { exact: true });
  }

  /** Primary submit button in the key-entry view. */
  getSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /Unlock solver/i });
  }

  /** Close (X) button — present in both views (top-right). */
  getCloseButton(): Locator {
    return this.page.getByRole("button", { name: /^Close$/i });
  }

  /** Returns from the key-entry view back to the gate view (does not dismiss). */
  getBackButton(): Locator {
    return this.page.getByRole("button", { name: /^Back$/i });
  }

  /** Instagram CTA button visible in the gate view. */
  getInstagramCtaButton(): Locator {
    return this.page.getByRole("button", { name: /DM on Instagram/i });
  }

  /** The "Already have a key? ›" link that switches gate → key-entry. */
  getSwitchToKeyEntryButton(): Locator {
    return this.page.getByRole("button", { name: /Already have a key/i });
  }

  /** Inline validation error shown after a rejected key attempt. */
  getErrorMessage(): Locator {
    return this.page.getByText(/That key doesn't look right/i);
  }

  async switchToKeyEntry(): Promise<void> {
    await this.getSwitchToKeyEntryButton().click();
  }

  async typeKey(key: string): Promise<void> {
    await this.getInput().fill(key);
  }

  async submit(): Promise<void> {
    await this.getSubmitButton().click();
  }

  /** Dismiss the modal via the close (X) button. */
  async close(): Promise<void> {
    await this.getCloseButton().click();
  }
}
