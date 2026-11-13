import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { InAppBrowser } from '../models/in-app-browser.model';
import { buildExternalBrowserUrl, detectInAppBrowser } from '../utils/in-app-browser.util';

/**
 * Reports whether Starwizz was opened inside an app's embedded browser
 * (e.g. from an Instagram link). Those browsers cannot save recordings, so
 * the shell warns the user and offers a way out to a real browser.
 */
@Injectable({ providedIn: 'root' })
export class InAppBrowserService {
  private readonly document = inject(DOCUMENT);

  /** The in-app browser hosting the page, or null in a regular browser. */
  readonly browser: InAppBrowser | null = detectInAppBrowser(
    this.document.defaultView?.navigator.userAgent ?? '',
  );

  /** Link reopening this page in the device's own browser, or null when the platform offers none. */
  readonly externalBrowserUrl: string | null = this.browser
    ? buildExternalBrowserUrl(this.browser, this.document.location.href)
    : null;
}
