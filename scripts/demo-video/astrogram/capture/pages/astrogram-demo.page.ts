import { existsSync, readFileSync } from "node:fs";
import type { Locator, Page, Route } from "@playwright/test";
import {
  ACCESS_KEY_STORAGE_KEY,
  APP_URL,
  PLACEHOLDER_ACCESS_KEY,
  PRESETS_STORAGE_KEY,
  ROSETTE_IMAGE,
  SEEDED_PRESETS,
  SOLVE_FIXTURE,
  SOLVE_PLACEHOLDER,
  TRAVEL_RIG,
} from "../app.constants";
import type { Director, Rect } from "../../../engine/capture/director";
import type { DemoShell, PanelId } from "../shells/shell";
import { DemoPointer } from "../../../engine/capture/demo-pointer";

/**
 * Page Object for driving Astrogram during a video capture, in either layout.
 *
 * Everything a beat does to the app goes through here, as user intent —
 * "choose a theme", "solve the image" — and every interaction is rendered as
 * visible cursor motion by {@link DemoPointer}. Whatever differs between the
 * phone and desktop layouts lives behind a {@link DemoShell}, so a beat is
 * written once and captured at both sizes.
 *
 * It deliberately does not touch application code. The two things the video
 * needs that the app does not offer — a repeatable plate solve and a saved rig
 * to switch to — are provided from outside: the solve is answered from a
 * recorded response, and the presets are written to storage before boot.
 */
export class AstrogramDemoPage {
  /** Cursor, taps, sweeps and scrolling. */
  readonly pointer: DemoPointer;

  /** Whether the solve is replayed from a real recording or the placeholder. */
  readonly solveSource: "recorded" | "placeholder" = existsSync(SOLVE_FIXTURE) ? "recorded" : "placeholder";

  /** Resolves the pending solve request; set while one is waiting. */
  private releaseSolve: (() => void) | null = null;

  constructor(
    readonly page: Page,
    private readonly d: Director,
    readonly shell: DemoShell,
  ) {
    const viewport = page.viewportSize();
    this.pointer = new DemoPointer(page, d, {
      x: (viewport?.width ?? 432) * 0.62,
      y: (viewport?.height ?? 768) * 0.55,
    });
  }

  /** The director, so a shell can hold frames of its own. */
  get director(): Director {
    return this.d;
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Installs everything that has to exist before the app boots: seeded
   * storage, the replayed API, and the file the upload picker receives.
   */
  async prepare(): Promise<void> {
    await this.page.addInitScript(
      ({ presetsKey, presets, accessKey, placeholder }) => {
        if (window.localStorage.getItem(presetsKey) === null) {
          window.localStorage.setItem(presetsKey, JSON.stringify(presets));
        }
        window.localStorage.setItem(accessKey, placeholder);
      },
      {
        presetsKey: PRESETS_STORAGE_KEY,
        presets: SEEDED_PRESETS,
        accessKey: ACCESS_KEY_STORAGE_KEY,
        placeholder: PLACEHOLDER_ACCESS_KEY,
      },
    );

    await this.page.route("**/api/v1/limits", (route) =>
      route.fulfill({
        json: {
          maxBytes: 10 * 1024 * 1024,
          minDimension: 1000,
          maxDimension: 8000,
          allowedExtensions: [".jpg", ".jpeg", ".png"],
        },
      }),
    );
    await this.page.route("**/api/v1/solve", (route) => this.answerSolve(route));

    // "Upload Target" opens the OS file picker, which Playwright surfaces as an
    // event instead; answering it here keeps the upload a single on-camera tap.
    this.page.on("filechooser", (chooser) => {
      void chooser.setFiles(ROSETTE_IMAGE);
    });
  }

  /**
   * Opens the app and stages it for the first beat, all before any frame is
   * captured.
   */
  async open(): Promise<void> {
    await this.page.goto(APP_URL);
    await this.page.getByTestId("card-hero").waitFor({ state: "visible", timeout: 120_000 });
    await this.waitForCard();

    // The video opens on the travel rig so that switching to the home rig in
    // the presets beat visibly changes the card.
    await this.shell.openPanelSilently(this.page, "equipment");
    await this.presetButton(TRAVEL_RIG).click();

    // The Wiki beat is only convincing if the description starts empty.
    await this.shell.openPanelSilently(this.page, "object");
    await this.panel().getByRole("textbox", { name: "Long-form caption" }).fill("");

    await this.shell.closePanelSilently(this.page);
    await this.shell.openPanelSilently(this.page, "layout");
    await this.shell.closePanelSilently(this.page);

    // The first export loads the rasteriser on demand and can take seconds;
    // pay for that here rather than on camera in the export beat.
    const warmUp = this.page.waitForEvent("download", { timeout: 120_000 });
    await this.page
      .locator("dba-ag-card-preview")
      .getByRole("button", { name: "Export", exact: true })
      .click();
    await (await warmUp).delete();

    await this.pointer.show();
  }

  /**
   * The card's "@astrogram" header bar, in viewport CSS pixels.
   *
   * The edit anchors every caption to it: it is the one solid, unchanging strip
   * on screen in both layouts and both modes, so a caption there never fights
   * the photograph or the panel behind it. Measured from the running app rather
   * than hard-coded, so it follows any layout change.
   */
  async cardHeaderRect(): Promise<Rect> {
    const header = this.page.locator(".post-header").first();
    await header.waitFor({ state: "visible", timeout: 15_000 });
    const box = await header.boundingBox();
    if (box === null) {
      throw new Error("the card header is not rendered");
    }
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  /** Waits until the card's images and fonts have finished loading. */
  async waitForCard(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        document.fonts.status === "loaded" &&
        Array.from(document.querySelectorAll("img")).every((img) => img.complete),
      undefined,
      { timeout: 30_000 },
    );
  }

  // ------------------------------------------------------------------- layout

  /** The open panel's content. */
  panel(): Locator {
    return this.shell.panelRoot(this.page);
  }

  /** Brings a panel on screen, on camera. */
  async openPanel(panel: PanelId, settle = 6): Promise<void> {
    await this.shell.openPanel(this, panel, settle);
  }

  /** Gives the card the frame and holds. */
  async revealResult(frames: number): Promise<void> {
    await this.shell.revealResult(this, frames);
  }

  /** Switches between Infographics and Stellar map with the mode tabs. */
  async switchMode(mode: "Infographics" | "Stellar map", settle = 10): Promise<void> {
    await this.pointer.tap(this.page.getByRole("tab", { name: mode, exact: true }), { settle });
  }

  // --------------------------------------------------------------- object info

  /** Types a new object name over the current one. */
  async typeName(name: string, settle = 10): Promise<void> {
    await this.pointer.typeInto(this.panel().getByRole("textbox", { name: "Object name" }), name, {
      settle,
    });
  }

  /** Taps Wiki and keeps filming until Wikipedia's text lands in the field. */
  async fetchWiki(): Promise<void> {
    const field = this.panel().getByRole("textbox", { name: "Long-form caption" });
    await this.pointer.tap(this.panel().getByRole("button", { name: /Wiki|Fetching/ }));
    await this.pointer.captureUntil(
      async () => (await field.inputValue()).trim().length > 0,
      240,
      "the Wikipedia description",
    );
  }

  // ------------------------------------------------------------------ capture

  /** Flips one filter row on or off. */
  async toggleFilter(name: string, settle = 12): Promise<void> {
    await this.pointer.tap(this.panel().getByRole("switch", { name: `${name} filter` }), { settle });
  }

  /** Types a frame count into a filter row. */
  async setFrames(name: string, frames: number, settle = 12): Promise<void> {
    await this.pointer.typeInto(
      this.panel().getByRole("spinbutton", { name: `${name} frames` }),
      String(frames),
      { framesPerChar: 3, settle },
    );
  }

  /** Picks a step on the Bortle scale. */
  async pickBortle(level: number, settle = 12): Promise<void> {
    await this.pointer.tap(this.panel().getByRole("button", { name: `Bortle ${level}`, exact: true }), {
      settle,
    });
  }

  // ---------------------------------------------------------------- equipment

  /** Loads a saved rig preset by name. */
  async applyPreset(name: string, settle = 12): Promise<void> {
    await this.pointer.tap(this.presetButton(name), { settle });
  }

  /** A preset's load button — not its delete button, which also carries the name. */
  private presetButton(name: string): Locator {
    return this.panel().locator("button.preset-load-btn").filter({ hasText: name });
  }

  // ------------------------------------------------------------------- themes

  /** The theme dropdown in the Layout panel. */
  private themeSelect(): Locator {
    return this.panel().locator("dba-ui-select").first().locator("select");
  }

  /** The size dropdown in the Layout panel. */
  private sizeSelect(): Locator {
    return this.panel().locator("dba-ui-select.size-select select");
  }

  /**
   * Chooses a theme. With `tap`, the cursor plays a press on the dropdown
   * first; without it the theme simply changes, for a quick run of looks.
   */
  async chooseTheme(label: string, opts: { tap?: boolean } = {}): Promise<void> {
    if (opts.tap !== false) {
      await this.pointer.pretendTap(this.themeSelect(), { settle: 3 });
    }
    // Forced: on a phone a quick run of looks changes the select while the
    // sheet holding it is lowered, where it is present but not visible.
    await this.themeSelect().selectOption({ label }, { force: true });
    await this.waitForCard();
  }

  /** Chooses an output size by its label, e.g. "9:16 · Story · 1080×1920". */
  async chooseSize(label: string, opts: { tap?: boolean } = {}): Promise<void> {
    if (opts.tap !== false) {
      await this.pointer.pretendTap(this.sizeSelect(), { settle: 3 });
    }
    // Forced: on a phone a quick run of looks changes the select while the
    // sheet holding it is lowered, where it is present but not visible.
    await this.sizeSelect().selectOption({ label }, { force: true });
    await this.waitForCard();
  }

  /**
   * Blends a colour input from its current value to `to` over `frames`, as if
   * dragging through the picker.
   */
  async sweepColour(input: Locator, to: string, frames: number): Promise<void> {
    const swatch = input.locator("xpath=..");
    await this.pointer.pretendTap(swatch, { settle: 2 });
    const from = await input.inputValue();
    const parse = (hex: string): number[] =>
      [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    const [a, b] = [parse(from), parse(to)];
    await this.d.animate(frames, async (t) => {
      const mixed =
        "#" +
        a
          .map((channel, i) => Math.round(channel + (b[i] - channel) * t).toString(16).padStart(2, "0"))
          .join("");
      await input.evaluate((element, value) => {
        const field = element as HTMLInputElement;
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }, mixed);
    });
  }

  /** The Layout panel's Accent colour input. */
  accentInput(): Locator {
    return this.panel().getByLabel("Accent colour", { exact: true });
  }

  // ------------------------------------------------------------------ caption

  /** Scrolls down to the Instagram-style caption and copies it. */
  async copyCaption(settle = 20): Promise<void> {
    const button = this.page.locator("dba-ag-caption-section").getByRole("button", { name: "Copy caption" });
    await this.pointer.ensureVisible(button, 24);
    await this.pointer.tap(button, { settle });
  }

  /** Scrolls the card column down to the end of the caption preview. */
  async scrollCaptionToEnd(frames = 30): Promise<void> {
    await this.pointer.ensureVisible(this.page.locator("dba-ag-caption-section .caption-foot"), frames);
  }

  /** Scrolls the card column back to the top. */
  async scrollPreviewToTop(frames = 14): Promise<void> {
    await this.pointer.scrollToTop(this.shell.previewScroller(this.page), frames);
  }

  // -------------------------------------------------------------- stellar map

  /** Taps Upload Target and films until the photo is in and ready to solve. */
  async uploadTarget(): Promise<void> {
    await this.pointer.tap(this.page.getByRole("button", { name: /Upload Target/ }));
    await this.pointer.captureUntil(
      async () => (await this.solveButton().count()) > 0 && (await this.solveButton().isVisible()),
      90,
      "the uploaded photo",
    );
  }

  /** Picks a field-of-view hint. */
  async chooseFov(label: "Auto" | "Wide" | "Medium" | "Narrow", settle = 8): Promise<void> {
    const select = this.page.locator("dba-ag-stellar-upload-panel dba-ui-select select");
    await this.pointer.pretendTap(select, { settle: 3 });
    await select.selectOption({ label });
    await this.d.hold(settle);
  }

  /**
   * Presses ASTROSOLVE, lets the loader run for `loaderFrames`, then releases
   * the recorded response and films until the objects are drawn.
   */
  async astrosolve(loaderFrames: number): Promise<number> {
    if (this.solveSource === "placeholder") {
      process.stdout.write(
        "  using the PLACEHOLDER solve — run capture/record-solve.mjs and re-capture before publishing\n",
      );
    }
    await this.pointer.tap(this.solveButton());
    await this.d.hold(loaderFrames);
    // The request leaves only after the app has read the file, so it may not
    // have reached the route yet on a fast host.
    await this.pointer.captureUntil(async () => this.releaseSolve !== null, 60, "the solve request");
    this.releaseSolve?.();
    const badge = this.objectsBadge();
    await this.pointer.captureUntil(async () => (await badge.count()) > 0, 120, "the annotations");
    return this.visibleObjectCount();
  }

  /** The number the "N OBJECTS" badge shows. */
  async visibleObjectCount(): Promise<number> {
    const text = await this.objectsBadge().innerText();
    return Number.parseInt(text, 10);
  }

  /** Taps one of the Display / Stars / Catalogs checkboxes by its label. */
  async toggleCheck(label: string, settle = 12): Promise<void> {
    await this.pointer.tap(this.panel().locator("button.check").filter({ hasText: label }), { settle });
  }

  /** Sweeps the Max magnitude slider through `stops`. */
  async sweepMagnitude(stops: number[], frames: number, hold = 10): Promise<void> {
    const block = this.panel().locator(".mag-block");
    await this.pointer.sweepSliderThrough(block.locator('input[type="range"]'), stops, frames, {
      hold,
      row: block,
    });
  }

  /** The current Max magnitude. */
  async maxMagnitude(): Promise<number> {
    return Number(await this.panel().locator('.mag-block input[type="range"]').inputValue());
  }

  /** The Annotation style panel's circle colour input. */
  circleColourInput(): Locator {
    return this.panel().locator('dba-ui-inspector-section').first().locator('input[type="color"]');
  }

  /**
   * The annotation marker to feature: the first whose label matches, else the
   * one nearest the middle of the photo.
   */
  async featuredAnnotation(prefer: RegExp): Promise<Locator> {
    const markers = this.page.locator("[data-annotation-id]");
    const count = await markers.count();
    let best: { index: number; score: number } | null = null;
    for (let i = 0; i < count; i += 1) {
      const marker = markers.nth(i);
      const title = (await marker.getAttribute("title")) ?? "";
      const box = await marker.boundingBox();
      if (box === null) {
        continue;
      }
      const layer = await this.page.locator(".annotations-layer").boundingBox();
      const cx = layer === null ? 0 : layer.x + layer.width / 2;
      const cy = layer === null ? 0 : layer.y + layer.height / 2;
      const distance = Math.hypot(box.x + box.width / 2 - cx, box.y + box.height / 2 - cy);
      const score = prefer.test(title) ? -1 : distance;
      if (best === null || score < best.score) {
        best = { index: i, score };
      }
    }
    if (best === null) {
      throw new Error("no annotation markers are on screen");
    }
    return markers.nth(best.index);
  }

  /**
   * Taps an empty patch of the photo, which clears the selection — so the
   * export does not carry the selected marker's highlight.
   */
  async clearSelection(settle = 8): Promise<void> {
    if ((await this.page.locator(".annotation-marker.selected").count()) === 0) {
      return;
    }
    const spot = await this.page.locator(".annotations-layer").evaluate((layer) => {
      const box = layer.getBoundingClientRect();
      for (let fy = 0.92; fy >= 0.08; fy -= 0.04) {
        for (let fx = 0.08; fx <= 0.92; fx += 0.04) {
          const x = box.left + box.width * fx;
          const y = box.top + box.height * fy;
          const hit = document.elementFromPoint(x, y);
          if (hit !== null && layer.contains(hit) && hit.closest(".annotation-marker") === null) {
            return { x, y };
          }
        }
      }
      return null;
    });
    if (spot === null) {
      throw new Error("no empty patch of the photo to tap");
    }
    await this.pointer.tapAt(spot, { settle });
  }

  /** Types a new label for the selected annotation. */
  async renameSelected(label: string, settle = 12): Promise<void> {
    await this.pointer.typeInto(this.panel().getByRole("textbox", { name: "Annotation label" }), label, {
      settle,
    });
  }

  // ------------------------------------------------------------------- export

  /** Chooses an output format in the Export panel. */
  async chooseFormat(label: "JPEG" | "PNG" | "WebP", settle = 8): Promise<void> {
    await this.pointer.tap(this.panel().locator("button.format-row").filter({ hasText: label }), {
      settle,
    });
  }

  /** Presses the Export panel's button and films until the file is saved. */
  async exportFromPanel(): Promise<string> {
    return this.pointer.tapForDownload(this.panel().locator("button.cta-btn"));
  }

  // ---------------------------------------------------------------- internals

  private solveButton(): Locator {
    return this.page.locator("dba-ag-stellar-upload-panel button.solve-btn");
  }

  private objectsBadge(): Locator {
    return this.page.locator("dba-ag-stellar-map-preview dba-ui-pill-badge").filter({ hasText: /[1-9]\d* OBJECTS/ });
  }

  /**
   * Answers the solve request from the recording, but only once the beat says
   * so — the loader's time on screen is decided in frames by the beat, not by
   * how fast the capture host happens to be.
   */
  private async answerSolve(route: Route): Promise<void> {
    await new Promise<void>((resolve) => {
      this.releaseSolve = resolve;
    });
    this.releaseSolve = null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: readFileSync(this.solveSource === "recorded" ? SOLVE_FIXTURE : SOLVE_PLACEHOLDER, "utf8"),
    });
  }
}
