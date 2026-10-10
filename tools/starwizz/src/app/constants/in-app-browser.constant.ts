import { InAppBrowserSignature } from '../models/in-app-browser.model';

/**
 * User-agent markers of the in-app browsers known to drop page-generated
 * downloads (Meta's shared embedded browser). Order matters: the first match
 * wins, so the more specific apps come before `Facebook`.
 *
 * `iosExternalBrowserPrefix` is the app's own "open in the default browser"
 * URL scheme on iOS; the encoded page URL is appended to it. Apps without
 * one fall back to {@link IOS_SAFARI_SCHEME}.
 */
export const IN_APP_BROWSER_SIGNATURES: readonly InAppBrowserSignature[] = [
  {
    appName: 'Threads',
    pattern: /\bBarcelona\b/,
    iosExternalBrowserPrefix: 'barcelona://extbrowser/?url=',
  },
  {
    appName: 'Instagram',
    pattern: /\bInstagram\b/,
    iosExternalBrowserPrefix: 'instagram://extbrowser/?url=',
  },
  { appName: 'Facebook', pattern: /\bFB_IAB\b|\bFBAN\b|\bFBAV\b/, iosExternalBrowserPrefix: null },
];

/** iOS scheme that reopens an https page in Safari (no "default browser" scheme exists). */
export const IOS_SAFARI_SCHEME = 'x-safari-https';
