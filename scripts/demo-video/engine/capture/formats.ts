/** The two cuts the demo is captured and rendered in. */
export type Format = "vertical" | "desktop";

/**
 * Viewport, scale and finished frame size per format.
 *
 * Shared by the Playwright config and the capture itself so the two can never
 * disagree about what is being recorded — the director needs the scale factor
 * to express focus rectangles in finished-frame pixels rather than CSS ones.
 *
 * Each lands on its target exactly: 432 x 768 at 2.5x is 1080 x 1920, and
 * 1536 x 864 at 1.25x is 1920 x 1080. The CSS widths choose the layout, since
 * Astrogram switches shells at 1080 CSS px (`MOBILE_BREAKPOINT_PX`); the scale
 * factors then buy back resolution without shrinking the UI.
 *
 * Desktop is 1536 wide so the card, the icon rail and the inspector all fit
 * side by side with the inspector's form fields at full width.
 */
export const FORMATS = {
  vertical: {
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2.5,
    frame: { width: 1080, height: 1920 },
  },
  desktop: {
    viewport: { width: 1536, height: 864 },
    deviceScaleFactor: 1.25,
    frame: { width: 1920, height: 1080 },
  },
} as const;

/** Reads the format this run is capturing. */
export const currentFormat = (): Format =>
  process.env.DEMO_FORMAT === "desktop" ? "desktop" : "vertical";
