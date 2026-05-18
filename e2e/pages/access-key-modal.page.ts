import { Locator, Page } from "@playwright/test";

export class AccessKeyModalPage {
  constructor(private readonly page: Page) {}

  /**
   * The modal heading — used as the presence/absence indicator for the modal.
   * The modal has no semantic dialog role (it is a plain div overlay), so the
   * heading is the most reliable semantic anchor.
   */
  getModal(): Locator {
    return this.page.getByRole("heading", { name: /ASTROSOLVE ACCESS/i });
  }

  /**
   * The access key input rendered by <dba-ui-input label="Access Key">.
   * The component renders a labelled <input>, allowing getByLabel to resolve it.
   */
  getInput(): Locator {
    return this.page.getByLabel("Access Key");
  }

  getSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /SUBMIT/i });
  }

  getCancelButton(): Locator {
    return this.page.getByRole("button", { name: /CANCEL/i });
  }

  /** Inline validation error shown after a rejected key attempt. */
  getErrorMessage(): Locator {
    return this.page.getByText("Invalid access key — please try again");
  }

  async typeKey(key: string): Promise<void> {
    await this.getInput().fill(key);
  }

  async submit(): Promise<void> {
    await this.getSubmitButton().click();
  }

  async cancel(): Promise<void> {
    await this.getCancelButton().click();
  }
}
