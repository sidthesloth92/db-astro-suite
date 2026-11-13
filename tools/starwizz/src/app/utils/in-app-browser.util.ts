import { IN_APP_BROWSER_SIGNATURES, IOS_SAFARI_SCHEME } from '../constants/in-app-browser.constant';
import { InAppBrowser, InAppBrowserPlatform } from '../models/in-app-browser.model';

/**
 * Identifies the platform a user agent belongs to.
 *
 * @param userAgent - The browser's user-agent string
 * @returns The platform the hand-off strategy depends on
 */
function detectPlatform(userAgent: string): InAppBrowserPlatform {
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios';
  }
  return 'other';
}

/**
 * Detects whether the page is running inside a known app-embedded browser
 * (Instagram, Threads, Facebook) rather than a full browser.
 *
 * @param userAgent - The browser's user-agent string
 * @returns The hosting in-app browser, or null in a regular browser
 */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  const signature = IN_APP_BROWSER_SIGNATURES.find(({ pattern }) => pattern.test(userAgent));
  if (!signature) {
    return null;
  }
  return { appName: signature.appName, platform: detectPlatform(userAgent) };
}

/**
 * Builds a link that reopens the page in the device's own browser:
 *
 * - Android: an `intent://` URL with no package, which Android resolves to
 *   the user's default browser (the fallback URL covers a failed resolve).
 * - iOS: the host app's own "open externally" scheme where it has one
 *   (default browser), otherwise Safari's scheme for https pages.
 *
 * None of these schemes is a documented contract, so the caller must also
 * tell the user how to do it by hand.
 *
 * @param browser - The in-app browser the page is running in
 * @param pageUrl - Absolute http(s) URL of the current page
 * @returns The hand-off URL, or null when the platform offers none
 */
export function buildExternalBrowserUrl(browser: InAppBrowser, pageUrl: string): string | null {
  const url = new URL(pageUrl);
  const cleanUrl = `${url.origin}${url.pathname}${url.search}`;
  const target = `${url.host}${url.pathname}${url.search}`;

  if (browser.platform === 'android') {
    const scheme = url.protocol.replace(':', '');
    return (
      `intent://${target}#Intent;scheme=${scheme};action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(cleanUrl)};end`
    );
  }

  if (browser.platform === 'ios') {
    const prefix = IN_APP_BROWSER_SIGNATURES.find(
      ({ appName }) => appName === browser.appName,
    )?.iosExternalBrowserPrefix;
    if (prefix) {
      return `${prefix}${encodeURIComponent(cleanUrl)}`;
    }
    return url.protocol === 'https:' ? `${IOS_SAFARI_SCHEME}://${target}` : null;
  }

  return null;
}
