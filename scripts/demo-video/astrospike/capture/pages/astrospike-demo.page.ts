import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { AstroSpikePage } from "../../../../../e2e/pages/astrospike.page";
import { Director, lerp, type Point, type Rect } from "../../../engine/capture/director";
import type { DemoShell } from "../shells/shell";

/** Linear map from a slider value to the x it sits at, in viewport CSS px. */
interface SliderTrack {
  y: number;
  toX(value: number): number;
  min: number;
  max: number;
}

/**
 * Page Object for driving AstroSpike during a video capture, in either layout.
 *
 * It composes the e2e Page Object (`e2e/pages/astrospike.page.ts`) rather than
 * extending or editing it — that one belongs to the test suite and must keep
 * working — and adds what only the demo needs: the canvas tool rail, star
 * discovery from canvas pixels, and every interaction rendered as visible
 * cursor motion instead of an instantaneous click.
 *
 * Whatever differs between the phone and desktop layouts lives behind a
 * {@link DemoShell}, so a beat is written once and captured at both sizes.
 *
 * Interactions go through `page.mouse` rather than `locator.click()` on
 * purpose. The mobile sheet sets `pointer-events: none` on itself while a
 * slider is being dragged (`app.css:70`), which Playwright's actionability
 * checks would reject even though a real pointer drag sails through it on
 * pointer capture.
 */
export class AstroSpikeDemoPage {
  /** The e2e Page Object, reused for the vocabulary it already provides. */
  readonly e2e: AstroSpikePage;

  private cursor: Point = { x: 216, y: 700 };

  constructor(
    readonly page: Page,
    private readonly d: Director,
    readonly shell: DemoShell,
  ) {
    this.e2e = new AstroSpikePage(page);
  }

  /** The director, so a shell can hold frames of its own. */
  get director(): Director {
    return this.d;
  }

  /** Where the synthetic cursor currently sits. */
  get cursorAt(): Point {
    return this.cursor;
  }

  // ---------------------------------------------------------------- lifecycle

  /** Opens the studio and waits for the sample image to finish detecting. */
  async open(): Promise<void> {
    await this.page.goto("http://localhost:4202/astrospike/");
    await this.page.getByRole("region", { name: "AstroSpike controls" })
      .waitFor({ state: "attached", timeout: 60_000 })
      .catch(() => undefined);
    await this.waitForDetection();
    await this.d.placeCursor(this.cursor);
    // Standalone beat runs skip the launch beat's fade-in, so make sure the
    // pointer is on screen whichever beats are being captured.
    await this.page.evaluate(() => window.__demo.setVisible(1));
  }

  /** Waits until the star-magnitude readout reports a non-zero total. */
  async waitForDetection(timeout = 120_000): Promise<number> {
    const total = this.controlRow("Star magnitude").locator(".row-total");
    await total.waitFor({ state: "attached", timeout });
    const deadline = Date.now() + timeout;
    for (;;) {
      const text = (await total.innerText().catch(() => "")).trim();
      const match = text.match(/of\s+([1-9]\d*)/);
      if (match !== null) {
        return Number.parseInt(match[1], 10);
      }
      if (Date.now() > deadline) {
        throw new Error(`detection did not finish; readout was "${text}"`);
      }
      await this.page.waitForTimeout(250);
    }
  }

  // ----------------------------------------------------------------- geometry

  /**
   * Scrolls a control into view inside the sheet, on camera.
   *
   * The controls sheet is a scroll container roughly 470px tall holding a
   * preset picker, up to six sliders and the export footer, so anything low in
   * the panel starts below the fold. Playwright still calls such an element
   * "visible" — it has a box — but a synthetic click at those coordinates lands
   * on whatever is actually painted there, which is how a tap can silently do
   * nothing. Scrolling is captured rather than jumped, because reaching the
   * lower controls is part of using the studio on a phone.
   */
  async ensureVisible(locator: Locator, frames = 10): Promise<void> {
    const info = await locator.evaluate((element) => {
      let node: HTMLElement | null = element.parentElement;
      while (node !== null) {
        const style = getComputedStyle(node);
        const scrolls = /(auto|scroll)/.test(style.overflowY);
        if (scrolls && node.scrollHeight > node.clientHeight + 1) {
          break;
        }
        node = node.parentElement;
      }
      if (node === null) {
        return null;
      }
      const box = element.getBoundingClientRect();
      const frame = node.getBoundingClientRect();
      const delta = box.top + box.height / 2 - (frame.top + frame.height / 2);
      const max = node.scrollHeight - node.clientHeight;
      const to = Math.max(0, Math.min(max, node.scrollTop + delta));
      node.setAttribute("data-demo-scroll", "1");
      return { from: node.scrollTop, to };
    });

    if (info === null) {
      return;
    }
    if (Math.abs(info.to - info.from) >= 4) {
      await this.d.animate(frames, async (t) => {
        await this.page.evaluate((value) => {
          const node = document.querySelector("[data-demo-scroll]");
          if (node !== null) {
            (node as HTMLElement).scrollTop = value;
          }
        }, info.from + (info.to - info.from) * t);
      });
    }
    await this.page.evaluate(() => {
      document.querySelector("[data-demo-scroll]")?.removeAttribute("data-demo-scroll");
    });
  }

  /**
   * The rectangle the edit should treat as the subject, padded a little so a
   * highlight drawn around it does not sit hard against the control.
   */
  async focusRect(locator: Locator, pad = 10): Promise<Rect | null> {
    const box = await locator.boundingBox();
    if (box === null) {
      return null;
    }
    return {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    };
  }

  /** Centre of a locator, in viewport CSS pixels. */
  async centreOf(locator: Locator): Promise<Point> {
    // Without an explicit wait, a locator that never appears would block until
    // the test timeout — 45 minutes of a capture that is already wrong.
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    const box = await locator.boundingBox();
    if (box === null) {
      throw new Error("locator has no box; it is not rendered");
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  // ------------------------------------------------------------- interactions

  /** Glides the cursor to a point, capturing the travel. */
  async glideTo(to: Point, frames = 10): Promise<void> {
    await this.d.moveCursor(this.cursor, to, frames);
    this.cursor = to;
  }

  /** Moves to a point and taps it, cursor motion and ripple included. */
  async tapAt(
    to: Point,
    opts: { travel?: number; settle?: number; focusRadius?: number } = {},
  ): Promise<void> {
    if (opts.focusRadius !== undefined) {
      const r = opts.focusRadius;
      this.d.focusOn({ x: to.x - r, y: to.y - r, width: r * 2, height: r * 2 });
    }
    await this.glideTo(to, opts.travel ?? 10);
    await this.d.pressDown(3);
    await this.page.mouse.click(to.x, to.y);
    await this.d.pressUp(7);
    if (opts.settle !== undefined) {
      await this.d.hold(opts.settle);
    }
    if (opts.focusRadius !== undefined) {
      this.d.blur();
    }
  }

  /** Moves to a locator's centre and taps it. */
  async tap(locator: Locator, opts: { travel?: number; settle?: number } = {}): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    await this.ensureVisible(locator);
    const point = await this.centreOf(locator);
    await this.assertHittable(locator, point);
    const rect = await this.focusRect(locator);
    if (rect !== null) {
      this.d.focusOn(rect);
    }
    await this.tapAt(point, opts);
    this.d.blur();
  }

  /**
   * Refuses to click a point that is not actually over the target.
   *
   * Playwright calls an element "visible" when it has a box, even if an
   * ancestor's `overflow: hidden` is clipping it off screen. Clicking its
   * centre then quietly operates whatever *is* painted there — which is how a
   * missed Deselect once landed on Export and put a stray "Saved · 36 MB" into
   * the middle of a take. Raising here turns that into an obvious failure
   * instead of a subtly wrong video.
   */
  private async assertHittable(locator: Locator, point: Point): Promise<void> {
    const hit = await locator.evaluate(
      (element, p: { x: number; y: number }) => {
        const target = document.elementFromPoint(p.x, p.y);
        if (target === null) {
          return "nothing";
        }
        if (element === target || element.contains(target) || target.contains(element)) {
          return null;
        }
        const name = target.tagName.toLowerCase();
        const label = target.getAttribute("aria-label") ?? target.textContent ?? "";
        return `${name} "${label.trim().slice(0, 40)}"`;
      },
      point,
    );
    if (hit !== null) {
      throw new Error(
        `tap target is not at its own coordinates ` +
          `(${Math.round(point.x)}, ${Math.round(point.y)}) — ${hit} is painted there. ` +
          `It is probably clipped by an ancestor's overflow.`,
      );
    }
  }

  /** Double-taps a point — the gesture that opens one star's own controls. */
  async doubleTapAt(to: Point, opts: { travel?: number; settle?: number } = {}): Promise<void> {
    await this.glideTo(to, opts.travel ?? 12);
    await this.d.pressDown(2);
    await this.page.mouse.dblclick(to.x, to.y);
    await this.d.pressUp(6);
    if (opts.settle !== undefined) {
      await this.d.hold(opts.settle);
    }
  }

  // ---------------------------------------------------------------- the sheet

  /** The floating controls sheet. */
  /**
   * Brings the controls within reach before a slider is driven.
   *
   * On a phone this raises the sheet; on desktop the pane is already beside
   * the stage and this does nothing.
   */
  async showControls(settle = 8): Promise<void> {
    await this.shell.showControls(this, settle);
  }

  /**
   * Gives the picture the whole frame and holds there.
   *
   * On a phone the sheet covers most of the screen, so it comes down first; on
   * desktop nothing was covering the picture and this is simply a hold.
   */
  async revealResult(frames: number): Promise<void> {
    await this.shell.revealResult(this, frames);
  }

  // --------------------------------------------------------------- the panel

  /** A slider row inside the controls sheet, found by its visible label. */
  controlRow(label: string): Locator {
    return this.page.locator(".slider-row").filter({ hasText: label }).first();
  }

  /** The native range input inside a global slider row. */
  controlSlider(label: string): Locator {
    return this.controlRow(label).getByRole("slider");
  }

  /**
   * A per-star slider, which lives in different markup from the globals: the
   * star bar renders `.star-bar__field` rows keyed by `.star-bar__key`, not the
   * `.slider-row` the control panel uses.
   */
  starRow(label: string): Locator {
    return this.shell
      .starPanel(this.page)
      .locator(".star-bar__field")
      .filter({ has: this.page.locator(".star-bar__key", { hasText: label }) })
      .first();
  }

  /** The native range input inside a per-star row. */
  starSlider(label: string): Locator {
    return this.starRow(label).getByRole("slider");
  }

  /** The value a global slider currently holds. */
  async controlValue(label: string): Promise<number> {
    return Number(await this.controlSlider(label).inputValue());
  }

  /** The text rendered beside a global slider's label. */
  async controlReadout(label: string): Promise<string> {
    return (await this.controlRow(label).locator(".row-value").innerText()).trim();
  }

  /** Sets any slider without a visible interaction — used to stage a beat. */
  async setSliderSilently(input: Locator, value: number): Promise<void> {
    await input.evaluate((element, next) => {
      const field = element as HTMLInputElement;
      field.value = String(next);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  /**
   * Measures where values sit along a slider's track.
   *
   * A native range input maps pointer x to value through its thumb width, which
   * is not readable from script, so this probes two positions and fits a line
   * through them instead of assuming the geometry. It leaves the slider on the
   * second probe's value — callers stage the real starting value afterwards.
   */
  private async measureTrack(input: Locator): Promise<SliderTrack> {
    await input.waitFor({ state: "visible", timeout: 15_000 });
    const box = await input.boundingBox();
    if (box === null) {
      throw new Error("slider is not rendered");
    }
    const min = Number(await input.getAttribute("min"));
    const max = Number(await input.getAttribute("max"));
    const y = box.y + box.height / 2;
    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;

    await this.page.mouse.move(x1, y);
    await this.page.mouse.down();
    const v1 = Number(await input.inputValue());
    await this.page.mouse.move(x2, y);
    const v2 = Number(await input.inputValue());
    await this.page.mouse.up();

    // A value at either end of the range maps to the very edge of the track,
    // and a press one pixel outside the input is a press on the row behind it —
    // the drag then never starts and the slider silently keeps its old value.
    // Every computed position is therefore held just inside the element.
    const inset = 2;
    const clamp = (x: number): number =>
      Math.max(box.x + inset, Math.min(box.x + box.width - inset, x));

    if (v2 === v1) {
      // Degenerate probe (a track too short to separate two values): fall back
      // to the box itself, which is close enough for a slider this small.
      return {
        y,
        min,
        max,
        toX: (v) => clamp(box.x + ((v - min) / (max - min)) * box.width),
      };
    }
    const slope = (v2 - v1) / (x2 - x1);
    return { y, min, max, toX: (v) => clamp(x1 + (v - v1) / slope) };
  }

  /**
   * Drags any slider from one value to another as a visible gesture: the cursor
   * travels to the thumb, presses (which ghosts the sheet so the photo shows
   * through), sweeps, and releases.
   */
  async sweepSlider(
    input: Locator,
    from: number,
    to: number,
    frames: number,
    opts: { travel?: number; hold?: number; row?: Locator } = {},
  ): Promise<void> {
    await this.sweepSliderThrough(input, [from, to], frames, opts);
  }

  /**
   * Drags a slider through a list of values in one continuous press.
   *
   * Running a control down to nothing and then up to its working value reads
   * as one gesture only if the finger never lifts: three separate drags look
   * like three separate edits. The frames are shared out by distance, and
   * each leg eases on its own, so the thumb slows into a turn and picks up
   * again rather than bouncing off it.
   */
  async sweepSliderThrough(
    input: Locator,
    stops: number[],
    frames: number,
    opts: { travel?: number; hold?: number; row?: Locator } = {},
  ): Promise<void> {
    if (stops.length < 2) {
      throw new Error("a slider sweep needs at least two stops");
    }
    const from = stops[0];
    const to = stops[stops.length - 1];
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await this.ensureVisible(input);
    // The row, not the track: a highlight around the bare input would leave the
    // label and the live readout — the two things that explain the drag —
    // outside the thing being pointed at.
    const rect = await this.focusRect(opts.row ?? input, 12);
    if (rect !== null) {
      this.d.focusOn(rect);
    }
    const track = await this.measureTrack(input);
    await this.setSliderSilently(input, from);

    const start = { x: track.toX(from), y: track.y };
    await this.glideTo(start, opts.travel ?? 10);

    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.d.pressDown(2);

    const legs = stops.slice(1).map((end, i) => ({ start: stops[i], end }));
    const distance = legs.reduce((sum, leg) => sum + Math.abs(leg.end - leg.start), 0);
    for (const leg of legs) {
      const share = distance === 0 ? 1 / legs.length : Math.abs(leg.end - leg.start) / distance;
      const legFrames = Math.max(6, Math.round(frames * share));
      await this.d.animate(legFrames, async (t) => {
        const x = track.toX(lerp(leg.start, leg.end, t));
        await this.page.mouse.move(x, track.y);
        await this.page.evaluate((p) => window.__demo.move(p.x, p.y), { x, y: track.y });
        this.cursor = { x, y: track.y };
      });
    }

    await this.page.mouse.up();
    await this.d.pressUp(5);

    // A drag that misses its track leaves the value untouched and raises
    // nothing, which would reach the finished video as a slider that visibly
    // does not respond. Check the control actually arrived.
    const landed = Number(await input.inputValue());
    const tolerance = (track.max - track.min) * 0.08;
    if (Math.abs(landed - to) > tolerance) {
      throw new Error(
        `slider drag missed: expected about ${to}, landed on ${landed}`,
      );
    }

    if (opts.hold !== undefined) {
      await this.d.hold(opts.hold);
    }
    this.d.blur();
  }

  /** Sweeps one of the global sliders, by label. */
  async sweep(
    label: string,
    from: number,
    to: number,
    frames: number,
    opts: { travel?: number; hold?: number } = {},
  ): Promise<void> {
    await this.sweepSlider(this.controlSlider(label), from, to, frames, {
      ...opts,
      row: this.controlRow(label),
    });
  }

  /** Sweeps one of the global sliders through several values in one drag. */
  async sweepThrough(
    label: string,
    stops: number[],
    frames: number,
    opts: { travel?: number; hold?: number } = {},
  ): Promise<void> {
    await this.sweepSliderThrough(this.controlSlider(label), stops, frames, {
      ...opts,
      row: this.controlRow(label),
    });
  }

  /**
   * The Star magnitude position at which the readout reports approximately
   * `target` stars, with the detected total it was solved against.
   */
  async starCountPosition(target: number): Promise<{ value: number; total: number }> {
    const total = await this.detectedTotal();
    const value = total <= 1 ? 1 : Math.min(1, Math.log(target) / Math.log(total));
    return { value, total };
  }

  /**
   * Sweeps Star magnitude until the readout reports approximately `target`
   * stars.
   *
   * The control is 0-1 but the cut is log-scaled — the count is
   * `total ** value` — so a given star count is not a fixed slider position: it
   * depends on how many stars detection found in this particular frame. The
   * live total is read off the readout and the position solved from it, so the
   * number on screen is the number the caption promises. A target beyond what
   * the frame yields simply drives the control to its maximum.
   */
  async sweepStarsToCount(
    target: number,
    frames: number,
    opts: { travel?: number; hold?: number } = {},
  ): Promise<number> {
    const total = await this.detectedTotal();
    const from = await this.controlValue("Star magnitude");
    const to = total <= 1 ? 1 : Math.min(1, Math.log(target) / Math.log(total));
    await this.sweep("Star magnitude", from, to, frames, opts);
    return total;
  }

  /** The total star count the Star magnitude readout reports. */
  async detectedTotal(): Promise<number> {
    const text = await this.controlRow("Star magnitude")
      .locator(".row-total")
      .innerText();
    const match = text.match(/of\s+([0-9]+)/);
    return match === null ? 0 : Number.parseInt(match[1], 10);
  }

  /** Sweeps one of the selected star's own sliders, by label. */
  async sweepStar(
    label: string,
    from: number,
    to: number,
    frames: number,
    opts: { travel?: number; hold?: number } = {},
  ): Promise<void> {
    await this.sweepSlider(this.starSlider(label), from, to, frames, {
      ...opts,
      row: this.starRow(label),
    });
  }

  /** Opens the preset dropdown and picks one by name. */
  async choosePreset(name: string, settle = 10): Promise<void> {
    await this.tap(this.page.locator("button.preset-trigger"), { settle: 6 });
    await this.tap(
      this.page.getByRole("option", { name: new RegExp(name) }),
      { settle },
    );
  }

  /** Switches between four- and six-armed spikes. */
  async chooseArms(count: 4 | 6, settle = 10): Promise<void> {
    await this.tap(
      this.page.getByRole("tab", { name: `${count} spikes` }),
      { settle },
    );
  }

  // ------------------------------------------------------------ canvas tools

  /** A tool-rail button, by its accessible name. */
  tool(name: string): Locator {
    return this.page.getByRole("button", { name });
  }

  /** The visible, spiked canvas. */
  resultCanvas(): Locator {
    return this.page.locator("canvas.after-canvas");
  }

  /** The before/after comparison divider. */
  compareHandle(): Locator {
    return this.page.getByRole("slider", { name: /before and after comparison/i });
  }

  /**
   * Drags the before/after divider across the frame.
   *
   * The `role="slider"` sits on `.compare-divider`, which is `inset: 0` and
   * `pointer-events: none` — so its "centre" is the middle of the whole stage
   * and a press there lands on the canvas behind it, leaving the divider
   * exactly where it was. The only pointer-enabled parts are the 44px grip and
   * the narrow grab column beside it, so the drag starts on the grip, wherever
   * that currently is.
   */
  async wipeCompareTo(toPercent: number, frames: number): Promise<void> {
    const canvas = this.resultCanvas();
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("canvas is not rendered");
    }
    const grip = this.page.locator(".compare-divider__grip").first();
    await grip.waitFor({ state: "visible", timeout: 15_000 });
    const from = await this.centreOf(grip);
    const targetX = box.x + (toPercent / 100) * box.width;

    await this.glideTo(from, 12);
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.d.pressDown(2);

    await this.d.animate(frames, async (t) => {
      const x = lerp(from.x, targetX, t);
      await this.page.mouse.move(x, from.y);
      await this.page.evaluate((p) => window.__demo.move(p.x, p.y), {
        x,
        y: from.y,
      });
      this.cursor = { x, y: from.y };
    });

    await this.page.mouse.up();
    await this.d.pressUp(5);

    // A press that misses the grip moves nothing and raises nothing, which is
    // how the divider once sat at the left edge for a whole beat while the
    // cursor swept across the picture.
    const landed = await this.compareHandle().getAttribute("aria-valuenow");
    const reached = Number(landed);
    if (!Number.isFinite(reached) || Math.abs(reached - toPercent) > 12) {
      throw new Error(
        `compare divider did not follow: asked for ${toPercent}%, ` +
          `aria-valuenow reports ${landed}`,
      );
    }
  }

  // ------------------------------------------------------------- star finding

  /**
   * Finds star cores on the rendered canvas and returns them in viewport
   * coordinates.
   *
   * The app exposes no star list to the page, and adding one would mean editing
   * shipping code for the sake of a video. Reading the canvas back is both
   * non-invasive and more honest: it targets what is actually drawn, which is
   * what a viewer would tap.
   *
   * Cores are found in the *untouched* canvas, because at a bright star's
   * centre both canvases are saturated and the difference between them is
   * therefore zero — scoring on added light finds spike arms, not stars. Which
   * stars already carry spikes is decided separately, by looking for added
   * light in a ring just outside each core, where the arms actually are.
   */
  async findStars(
    count: number,
    opts: {
      unspiked?: boolean;
      margin?: number;
      minSeparation?: number;
      maxY?: number;
    } = {},
  ): Promise<Point[]> {
    const margin = opts.margin ?? 48;
    const minSeparation = opts.minSeparation ?? 56;
    const unspiked = opts.unspiked ?? false;
    const maxY = opts.maxY ?? (await this.shell.canvasMaxY(this.page));

    return this.page.evaluate(
      ({ count, margin, minSeparation, unspiked, maxY }) => {
        const after = document.querySelector("canvas.after-canvas") as HTMLCanvasElement | null;
        const before = document.querySelector("canvas.before-canvas") as HTMLCanvasElement | null;
        if (after === null || before === null) {
          return [];
        }
        const rect = after.getBoundingClientRect();
        const w = after.width;
        const h = after.height;
        if (w === 0 || h === 0) {
          return [];
        }
        const afterData = after.getContext("2d")!.getImageData(0, 0, w, h).data;
        const beforeData = before.getContext("2d")!.getImageData(0, 0, w, h).data;

        const luma = (d: Uint8ClampedArray, x: number, y: number): number => {
          const i = (y * w + x) * 4;
          return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        };

        // Peak of each grid cell, so two samples never land on one star.
        const cell = 22;
        const peaks: { px: number; py: number; core: number }[] = [];
        for (let cy = 0; cy < h; cy += cell) {
          for (let cx = 0; cx < w; cx += cell) {
            let best = -1;
            let bx = 0;
            let by = 0;
            for (let y = cy; y < Math.min(cy + cell, h); y += 1) {
              for (let x = cx; x < Math.min(cx + cell, w); x += 1) {
                const value = luma(beforeData, x, y);
                if (value > best) {
                  best = value;
                  bx = x;
                  by = y;
                }
              }
            }
            if (best > 90) {
              // A bright star saturates a plateau, and the first pixel of that
              // plateau is its top-left edge, not its centre. The studio hit
              // tests against every detected star, so a click on the edge of a
              // big star can land on a neighbour; aim at the plateau's centroid.
              let sx = 0;
              let sy = 0;
              let n = 0;
              for (let y = Math.max(0, by - 14); y <= Math.min(h - 1, by + 14); y += 1) {
                for (let x = Math.max(0, bx - 14); x <= Math.min(w - 1, bx + 14); x += 1) {
                  if (luma(beforeData, x, y) >= best - 25) {
                    sx += x;
                    sy += y;
                    n += 1;
                  }
                }
              }
              peaks.push({ px: Math.round(sx / n), py: Math.round(sy / n), core: best });
            }
          }
        }

        // How much light the renderer added just outside the core is what
        // separates a spiked star from one the magnitude cut skipped.
        const ringAdded = (px: number, py: number, radii: number[]): number => {
          let most = 0;
          for (const r of radii) {
            for (let a = 0; a < 16; a += 1) {
              const angle = (a * Math.PI) / 8;
              const x = Math.round(px + r * Math.cos(angle));
              const y = Math.round(py + r * Math.sin(angle));
              if (x < 0 || y < 0 || x >= w || y >= h) {
                continue;
              }
              most = Math.max(most, luma(afterData, x, y) - luma(beforeData, x, y));
            }
          }
          return most;
        };

        const scored = peaks
          .map((peak) => ({ ...peak, added: ringAdded(peak.px, peak.py, [8, 12, 16]) }))
          .filter((peak) => (unspiked ? peak.added <= 3 : peak.added > 8))
          .sort((a, b) => (unspiked ? b.core - a.core : b.added + b.core - (a.added + a.core)));

        const picked: { x: number; y: number }[] = [];
        for (const peak of scored) {
          const point = {
            x: rect.left + (peak.px / w) * rect.width,
            y: rect.top + (peak.py / h) * rect.height,
          };
          if (
            point.x < rect.left + margin ||
            point.x > rect.right - margin ||
            point.y < rect.top + margin ||
            point.y > rect.bottom - margin ||
            point.y > maxY
          ) {
            continue;
          }
          const clash = picked.some(
            (p) => Math.hypot(p.x - point.x, p.y - point.y) < minSeparation,
          );
          if (clash) {
            continue;
          }
          picked.push(point);
          if (picked.length >= count) {
            break;
          }
        }
        return picked;
      },
      { count, margin, minSeparation, unspiked, maxY },
    );
  }

  /**
   * The brightest stars the studio itself detected that are on screen, in
   * viewport coordinates, brightest first.
   *
   * Reading bright pixels off the canvas finds glare, not stars: the studio
   * hit tests a click against its own detections, and a bright patch of
   * nebula or the edge of a big star's glow is often nowhere near one, so the
   * click silently does nothing. When the point has to be a star a viewer
   * picks out at a glance — removing spikes the audience must see go — this
   * asks the dev build's component for its brightness-ranked detections and
   * maps them through the stage's own pointer transform, which is linear, so
   * two probes invert it.
   */
  async findBrightestStars(
    count: number,
    opts: { margin?: number; minSeparation?: number; maxY?: number } = {},
  ): Promise<Point[]> {
    const margin = opts.margin ?? 48;
    const minSeparation = opts.minSeparation ?? 56;
    const maxY = opts.maxY ?? (await this.shell.canvasMaxY(this.page));

    return this.page.evaluate(
      ({ count, margin, minSeparation, maxY }) => {
        interface StageProbe {
          editor: { renderedStars(): { id: number; x: number; y: number }[] };
          imagePointAt(x: number, y: number): { x: number; y: number } | null;
          starAt(x: number, y: number): { id: number } | null;
        }
        // The dev build's debugging hook: the only way in without adding a
        // star list to shipping code for the sake of a video.
        const ng = (window as unknown as { ng?: { getComponent(e: Element): unknown } }).ng;
        const host = document.querySelector("dba-as-spike-stage");
        const canvas = document.querySelector("canvas.after-canvas");
        if (ng === undefined || host === null || canvas === null) {
          return [];
        }
        const stage = ng.getComponent(host) as StageProbe;
        const rect = canvas.getBoundingClientRect();
        const a = stage.imagePointAt(rect.left, rect.top);
        const b = stage.imagePointAt(rect.right, rect.bottom);
        if (a === null || b === null || a.x === b.x || a.y === b.y) {
          return [];
        }
        const toClient = (x: number, y: number) => ({
          x: rect.left + ((x - a.x) / (b.x - a.x)) * rect.width,
          y: rect.top + ((y - a.y) / (b.y - a.y)) * rect.height,
        });

        const picked: { x: number; y: number }[] = [];
        for (const star of stage.editor.renderedStars()) {
          const point = toClient(star.x, star.y);
          if (
            point.x < rect.left + margin ||
            point.x > rect.right - margin ||
            point.y < rect.top + margin ||
            point.y > rect.bottom - margin ||
            point.y > maxY
          ) {
            continue;
          }
          if (picked.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < minSeparation)) {
            continue;
          }
          // A tighter neighbour can own the click; only keep points that
          // resolve to this very star.
          if (stage.starAt(point.x, point.y)?.id !== star.id) {
            continue;
          }
          picked.push(point);
          if (picked.length >= count) {
            break;
          }
        }
        return picked;
      },
      { count, margin, minSeparation, maxY },
    );
  }

  /** The per-star bar, which only exists while a star is selected. */
  starBar(): Locator {
    return this.shell.starPanel(this.page);
  }

  /**
   * Double-taps candidates in turn until one actually opens its own controls.
   *
   * Canvas-derived coordinates land within a pixel or two of a core, but the
   * studio's hit test has a finite radius and a candidate can sit just outside
   * it. Trying the next brightest star is cheaper, and looks more natural, than
   * failing the capture.
   */
  async selectStar(candidates: Point[]): Promise<boolean> {
    for (const candidate of candidates) {
      await this.doubleTapAt(candidate, { settle: 12 });
      const opened = await this.starBar()
        .waitFor({ state: "visible", timeout: 2_500 })
        .then(() => true)
        .catch(() => false);
      if (opened) {
        return true;
      }
    }
    return false;
  }

  /**
   * Zooms the studio's own view, anchored on a point, one wheel notch at a
   * time.
   *
   * The tool rail's +/- buttons zoom about the centre of the frame, which is no
   * use for getting in close on a particular group of stars. The wheel anchors
   * on the cursor instead, so this parks the pointer on the target first and
   * lets the picture grow around it. Each notch is 1.2x and the studio clamps
   * at 8x, so nine notches lands a little over 5x.
   *
   * Negative `notches` zooms back out along the same anchor, which returns to
   * roughly the original framing — the rail's Reset button would do it in one
   * click but also throws away every slider value set so far.
   */
  async zoomAt(at: Point, notches: number, framesPerNotch = 3): Promise<void> {
    await this.glideTo(at, 12);
    await this.page.mouse.move(at.x, at.y);
    const direction = notches < 0 ? 120 : -120;
    for (let i = 0; i < Math.abs(notches); i += 1) {
      await this.page.mouse.wheel(0, direction);
      for (let f = 0; f < framesPerNotch; f += 1) {
        await this.d.frame();
      }
    }
  }

  /** Centre of the visible canvas, in viewport CSS pixels. */
  async canvasCentre(): Promise<Point> {
    return this.centreOf(this.resultCanvas());
  }

  /**
   * Finds the busiest patch of sky on screen and returns its centre.
   *
   * Zooming into the single brightest star tends to land on something isolated,
   * which then gives nothing to click on once magnified. This picks the star
   * with the most neighbours within `radius` and returns the centroid of that
   * group, so the close-up has several stars in it to add and remove.
   */
  async findCluster(sample = 12, radius = 240): Promise<Point> {
    const stars = await this.findStars(sample, { minSeparation: 40 });
    if (stars.length === 0) {
      const viewport = this.page.viewportSize();
      return { x: (viewport?.width ?? 432) / 2, y: (viewport?.height ?? 768) / 2 };
    }

    let best = stars[0];
    let bestGroup: Point[] = [stars[0]];
    for (const star of stars) {
      const group = stars.filter(
        (other) => Math.hypot(other.x - star.x, other.y - star.y) <= radius,
      );
      if (group.length > bestGroup.length) {
        best = star;
        bestGroup = group;
      }
    }
    void best;
    return {
      x: bestGroup.reduce((sum, p) => sum + p.x, 0) / bestGroup.length,
      y: bestGroup.reduce((sum, p) => sum + p.y, 0) / bestGroup.length,
    };
  }

  // -------------------------------------------------------------- image input

  /**
   * Stages a file for a drag-and-drop without dispatching anything.
   *
   * The bytes cross into the page here, outside any captured frame, so the
   * transfer never shows up as a stalled moment in the video.
   */
  async stageDrop(filePath: string): Promise<void> {
    const base64 = readFileSync(filePath).toString("base64");
    const name = path.basename(filePath);
    const type = name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    await this.page.evaluate(
      ({ base64, name, type }) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const transfer = new DataTransfer();
        transfer.items.add(new File([bytes], name, { type }));
        (window as unknown as { __demoDrop: DataTransfer }).__demoDrop = transfer;
      },
      { base64, name, type },
    );
  }

  /** Fires a dragover on the dropzone, which lights its border. */
  async hoverDrop(): Promise<void> {
    await this.page.evaluate(() => {
      const zone = document.querySelector("dba-as-image-dropzone");
      const transfer = (window as unknown as { __demoDrop: DataTransfer }).__demoDrop;
      zone?.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    });
  }

  /** Completes the drop, handing the staged file to the studio. */
  async releaseDrop(): Promise<void> {
    await this.page.evaluate(() => {
      const zone = document.querySelector("dba-as-image-dropzone");
      const transfer = (window as unknown as { __demoDrop: DataTransfer }).__demoDrop;
      zone?.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    });
  }

  /**
   * Clears the startup sample without capturing a single frame.
   *
   * The studio loads a sample of its own at boot, so the only way the video can
   * open on the empty state is to remove it first — and the removal itself is
   * not part of the story. This uses a plain click rather than the animated
   * tap, so no frames are produced.
   */
  async resetToEmptyState(): Promise<void> {
    const remove = this.page.getByRole("button", { name: "Remove image" });
    if ((await remove.count()) > 0) {
      await remove.click();
    }
    await this.page
      .getByText("Drop your astrophoto here")
      .waitFor({ state: "visible", timeout: 15_000 });
    // Removing the image leaves the detection badge reading "0 stars detected"
    // for its linger period. Opening the video on that looks like a failure
    // rather than an empty studio, so wait it out before any frame is taken.
    await this.page
      .locator(".stage-badge")
      .waitFor({ state: "detached", timeout: 15_000 })
      .catch(() => undefined);
  }

  /** Reloads the studio so the video can show it coming up cold. */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.d.placeCursor(this.cursor);
  }

  /** Opens the export split-button's menu, showing all three outputs. */
  async openExportMenu(settle = 12): Promise<void> {
    await this.tap(this.exportMenuToggle(), { settle });
  }

  /**
   * Closes the export menu from the same arrow, without choosing anything.
   *
   * Refuses to leave the menu open: a stray pick here would export a file and
   * put a "Saved" confirmation into a beat that is only meant to show options.
   */
  async closeExportMenu(settle = 12): Promise<void> {
    await this.tap(this.exportMenuToggle(), { settle });
    await this.page.getByRole("menu").waitFor({ state: "hidden", timeout: 2_000 });
  }

  /**
   * The split button's arrow. Addressed by its own class: "the last button in
   * the export control" is the arrow only while the menu is closed — once it
   * opens, the last button is the bottom menu item, and tapping it exports.
   */
  private exportMenuToggle(): Locator {
    return this.page.locator("dba-ui-split-button button.chevron");
  }

  /**
   * Picks an export from the open menu and keeps capturing while it encodes.
   *
   * Menu items are matched on their descriptions, which is what a user actually
   * reads, and the download is discarded — the video only needs the studio's
   * own "Saved" confirmation, not the file.
   */
  async exportFromMenu(description: RegExp, d: Director): Promise<string> {
    const pending = this.page.waitForEvent("download", { timeout: 180_000 });
    let settled = false;
    const download = pending.then((file) => {
      settled = true;
      return file;
    });

    await this.tap(this.page.getByText(description).first(), {});
    for (let i = 0; i < 90 && !settled; i += 1) {
      await d.frame();
    }

    const file = await download;
    const name = file.suggestedFilename();
    await file.delete();
    return name;
  }
}
