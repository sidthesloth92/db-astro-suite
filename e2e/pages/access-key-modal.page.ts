import { Locator, Page } from "@playwright/test";

/**
 * Page object for the two-view access-key modal:
 *
 *  1. "CTA" view (shown by default):
 *     - Heading: "🔑 WANNA TRY IT OUT?"
 *     - Buttons: "📸 DM ON INSTAGRAM", "Already have a key? ›", "CLOSE"
 *  2. "Key-entry" view (shown after clicking "Already have a key? ›"
 *     OR automatically when the modal opens with showError=true):
 *     - Heading: "🔑 ENTER ACCESS KEY"
 *     - Input + "BACK" + "SUBMIT" buttons
 *
 * `getModal()` anchors on the dialog container so it works in both
 * views — heading text changes per view, so the heading isn't a stable
 * "is the modal open" indicator.
 */
export class AccessKeyModalPage {
  constructor(private readonly page: Page) {}

  /**
   * Dialog container — present regardless of which view is showing.
   * Resolved via ARIA `role="dialog"` rendered by the modal component; the
   * heading inside the dialog changes per view ("WANNA TRY IT OUT?" vs
   * "ENTER ACCESS KEY"), so we anchor on the dialog role itself rather
   * than an accessible name.
   */
  getModal(): Locator {
    return this.page.getByRole("dialog");
  }

  /** Heading shown in the default CTA view. */
  getCtaHeading(): Locator {
    return this.page.getByRole("heading", { name: /WANNA TRY IT OUT/i });
  }

  /** Heading shown after switching to the key-entry view. */
  getKeyEntryHeading(): Locator {
    return this.page.getByRole("heading", { name: /ENTER ACCESS KEY/i });
  }

  /**
   * The access key input rendered by <dba-ui-input label="Access Key">.
   * Only present in the key-entry view.
   *
   * Uses `{ exact: true }` because the dialog itself is labelled
   * "🔑 ENTER ACCESS KEY" (via aria-labelledby), so a substring match on
   * "Access Key" would resolve both the dialog and the input.
   */
  getInput(): Locator {
    return this.page.getByLabel("Access Key", { exact: true });
  }

  getSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /^SUBMIT$/i });
  }

  /** Dismiss button shown in the CTA view (top-level dismissal). */
  getCloseButton(): Locator {
    return this.page.getByRole("button", { name: /^CLOSE$/i });
  }

  /** Returns from the key-entry view back to the CTA view (does not dismiss). */
  getBackButton(): Locator {
    return this.page.getByRole("button", { name: /^BACK$/i });
  }

  /** Instagram CTA button visible in the CTA view. */
  getInstagramCtaButton(): Locator {
    return this.page.getByRole("button", { name: /DM ON INSTAGRAM/i });
  }

  /** The "Already have a key? ›" link that switches CTA → key-entry. */
  getSwitchToKeyEntryButton(): Locator {
    return this.page.getByRole("button", { name: /Already have a key/i });
  }

  /** Inline validation error shown after a rejected key attempt. */
  getErrorMessage(): Locator {
    return this.page.getByText("Invalid access key — please try again");
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

  /** Dismiss the modal from the CTA view. */
  async close(): Promise<void> {
    await this.getCloseButton().click();
  }
}
