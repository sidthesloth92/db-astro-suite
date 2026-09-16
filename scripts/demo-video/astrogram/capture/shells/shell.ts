import type { Locator, Page } from "@playwright/test";
import type { AstrogramDemoPage } from "../pages/astrogram-demo.page";

/** Which layout Astrogram is rendering. */
export type ShellId = "mobile" | "desktop";

/** Every inspector panel a beat can ask for, across both modes. */
export type PanelId =
  | "layout"
  | "object"
  | "capture"
  | "equipment"
  | "export"
  | "filters"
  | "style"
  | "selected";

/**
 * The parts of a beat that depend on which layout Astrogram is rendering.
 *
 * At 1080 CSS px and up the card sits beside an icon rail and an always-open
 * inspector, so opening a panel is one click and the card stays in view while
 * it is edited. Below that, the panels live in a floating sheet that covers
 * most of the card, opened from a bottom tab bar — an edit is only visible once
 * the sheet is back down.
 *
 * Beats therefore call intent-level verbs and a shell decides the mechanism, so
 * the timeline is written once and captured twice.
 */
export interface DemoShell {
  /** Which layout this is. */
  readonly id: ShellId;

  /**
   * Brings a panel on screen, on camera. Desktop taps the rail; mobile taps the
   * bottom tab, which raises the sheet.
   */
  openPanel(app: AstrogramDemoPage, panel: PanelId, settle: number): Promise<void>;

  /** The same as {@link openPanel} but instant and uncaptured, for staging. */
  openPanelSilently(page: Page, panel: PanelId): Promise<void>;

  /**
   * Gives the card the frame and holds there. Mobile lowers the sheet first;
   * desktop simply holds.
   */
  revealResult(app: AstrogramDemoPage, frames: number): Promise<void>;

  /** Lowers the sheet without capturing; a no-op on desktop. */
  closePanelSilently(page: Page): Promise<void>;

  /** The element that holds the open panel's content. */
  panelRoot(page: Page): Locator;

  /** The scroll container around the card and its caption preview. */
  previewScroller(page: Page): Locator;
}
