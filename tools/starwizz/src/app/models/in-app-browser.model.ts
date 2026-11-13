/** Mobile platform an in-app browser runs on — decides how the page can hand off to a real browser. */
export type InAppBrowserPlatform = 'android' | 'ios' | 'other';

/**
 * An app-embedded browser (Instagram, Facebook, …) the page was opened in.
 * These are web views, not full browsers: they silently drop downloads of
 * files generated in the page, so a finished recording cannot be saved.
 */
export interface InAppBrowser {
  /** Display name of the app hosting the embedded browser. */
  appName: string;
  /** Platform the host app runs on. */
  platform: InAppBrowserPlatform;
}

/** Maps a user-agent marker to the app whose embedded browser sends it. */
export interface InAppBrowserSignature {
  /** Display name of the host app. */
  appName: string;
  /** Pattern matching the app's user-agent marker. */
  pattern: RegExp;
  /** The app's iOS "open in default browser" URL prefix, or null when it has none. */
  iosExternalBrowserPrefix: string | null;
}
