/** Hooks index.html's inline Google tag script puts on `window`. */
export interface AnalyticsWindow {
  /** Loads Google Analytics once consent is given (no-op on localhost). */
  celestoryLoadAnalytics?: () => void;
  /** The Google tag function, present once the inline script ran. */
  gtag?: (...args: unknown[]) => void;
}
