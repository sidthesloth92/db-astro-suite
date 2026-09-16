import type { Locator, Page } from "@playwright/test";
import { Director, lerp, type Point, type Rect } from "./director";

/** Linear map from a slider value to the x it sits at, in viewport CSS px. */
interface SliderTrack {
  y: number;
  toX(value: number): number;
  min: number;
  max: number;
}

/**
 * Every interaction rendered as something a viewer can see: cursor travel, a
 * press, a ripple, a highlight around the control, and scrolling on camera.
 *
 * Nothing here knows which app it is driving. It is lifted from the AstroSpike
 * capture's page object so the Astrogram page object can stay about Astrogram,
 * and it is the piece to share once both videos have shipped.
 *
 * Interactions go through `page.mouse` rather than `locator.click()` on
 * purpose: the cursor has to travel to the exact point that is pressed, and a
 * locator click would happen wherever Playwright decided, off camera.
 */
export class DemoPointer {
  private cursor: Point;

  constructor(
    readonly page: Page,
    private readonly d: Director,
    start: Point,
  ) {
    this.cursor = start;
  }

  /** Where the synthetic cursor currently sits. */
  get at(): Point {
    return this.cursor;
  }

  /** Puts the cursor on screen at its current spot, without capturing. */
  async show(): Promise<void> {
    await this.d.placeCursor(this.cursor);
    await this.page.evaluate(() => window.__demo.setVisible(1));
  }

  // ----------------------------------------------------------------- geometry

  /**
   * Scrolls an element into the middle of its scroll container, on camera.
   *
   * Playwright calls an element below the fold "visible" — it has a box — but a
   * click at those coordinates lands on whatever is actually painted there, so
   * anything that might be out of view is brought in first. The scroll is
   * captured rather than jumped because reaching the control is part of using
   * the app.
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
      // Already comfortably inside the container: leave it where it is, so a
      // tap does not nudge the panel for no reason.
      if (box.top >= frame.top + 24 && box.bottom <= frame.bottom - 24) {
        return null;
      }
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
   * Scrolls a container back to its top, on camera, when it is not there
   * already.
   */
  async scrollToTop(container: Locator, frames = 12): Promise<void> {
    const from = await container.evaluate((node) => node.scrollTop);
    if (from < 4) {
      return;
    }
    await this.d.animate(frames, async (t) => {
      await container.evaluate((node, value) => {
        node.scrollTop = value;
      }, from * (1 - t));
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
  async tapAt(to: Point, opts: { travel?: number; settle?: number } = {}): Promise<void> {
    await this.glideTo(to, opts.travel ?? 10);
    await this.d.pressDown(3);
    await this.page.mouse.click(to.x, to.y);
    await this.d.pressUp(7);
    if (opts.settle !== undefined) {
      await this.d.hold(opts.settle);
    }
  }

  /**
   * Moves to a locator's centre and taps it, with a highlight around it while
   * the cursor travels and presses.
   */
  async tap(
    locator: Locator,
    opts: { travel?: number; settle?: number; focus?: boolean } = {},
  ): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    await this.ensureVisible(locator);
    const point = await this.centreOf(locator);
    await this.assertHittable(locator, point);
    const rect = opts.focus === false ? null : await this.focusRect(locator);
    if (rect !== null) {
      this.d.focusOn(rect);
    }
    await this.tapAt(point, opts);
    this.d.blur();
  }

  /**
   * Plays a tap on a control — travel, highlight, press and ripple — without
   * dispatching a click.
   *
   * For native `<select>` and colour inputs. A real click opens the browser's
   * own popup, which is drawn outside the page and so never appears in a
   * screenshot, and which then swallows the pointer until it is dismissed. The
   * caller sets the value itself once the gesture has played.
   */
  async pretendTap(locator: Locator, opts: { travel?: number; settle?: number } = {}): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    await this.ensureVisible(locator);
    const point = await this.centreOf(locator);
    const rect = await this.focusRect(locator);
    if (rect !== null) {
      this.d.focusOn(rect);
    }
    await this.glideTo(point, opts.travel ?? 10);
    await this.d.pressDown(3);
    await this.d.pressUp(7);
    if (opts.settle !== undefined) {
      await this.d.hold(opts.settle);
    }
    this.d.blur();
  }

  /** Whether a click at the element's centre would land on the element itself. */
  async isHittable(locator: Locator): Promise<boolean> {
    const point = await this.centreOf(locator);
    return this.assertHittable(locator, point).then(
      () => true,
      () => false,
    );
  }

  /**
   * Refuses to click a point that is not actually over the target.
   *
   * Playwright calls an element "visible" when it has a box, even if an
   * ancestor's `overflow: hidden` is clipping it or a sheet is painted over it.
   * Clicking its centre then quietly operates whatever *is* painted there.
   * Raising here turns that into an obvious failure instead of a subtly wrong
   * video.
   */
  async assertHittable(locator: Locator, point: Point): Promise<void> {
    const hit = await locator.evaluate(
      (element, p: { x: number; y: number }) => {
        const target = document.elementFromPoint(p.x, p.y);
        if (target === null) {
          return "nothing";
        }
        if (element === target || element.contains(target) || target.contains(element)) {
          return null;
        }
        // A native <select> or label forwards the click to the control it
        // wraps, so hitting its own label counts as hitting it.
        if (target.closest("label")?.contains(element)) {
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
          `(${Math.round(point.x)}, ${Math.round(point.y)}) — ${hit} is painted there.`,
      );
    }
  }

  /**
   * Replaces the text in a field one character at a time, as typing.
   *
   * The field is tapped first so the cursor visibly goes to it, then its
   * current contents are selected and overtyped — which is what a person does,
   * and it keeps the app's own input handlers in charge of every change.
   */
  async typeInto(
    field: Locator,
    text: string,
    opts: { framesPerChar?: number; settle?: number } = {},
  ): Promise<void> {
    await this.tap(field, { settle: 3 });
    // Select-all through the keyboard rather than `selectText()`: number inputs
    // do not support the selection API, and the capture panel's frame and
    // second counts are number inputs.
    await field.focus();
    await this.page.keyboard.press("ControlOrMeta+A");
    const perChar = opts.framesPerChar ?? 2;
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.d.hold(perChar);
    }
    if (opts.settle !== undefined) {
      await this.d.hold(opts.settle);
    }
  }

  /** Drags a locator's centre by an offset, as one continuous press. */
  async dragBy(locator: Locator, dx: number, dy: number, frames: number): Promise<void> {
    const from = await this.centreOf(locator);
    await this.glideTo(from, 12);
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.d.pressDown(3);
    await this.d.animate(frames, async (t) => {
      const x = lerp(from.x, from.x + dx, t);
      const y = lerp(from.y, from.y + dy, t);
      await this.page.mouse.move(x, y);
      await this.page.evaluate((p) => window.__demo.move(p.x, p.y), { x, y });
      this.cursor = { x, y };
    });
    await this.page.mouse.up();
    await this.d.pressUp(6);
  }

  // ------------------------------------------------------------------ sliders

  /** Sets any range input without a visible interaction — used to stage a beat. */
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
    const inset = 2;
    const clamp = (x: number): number =>
      Math.max(box.x + inset, Math.min(box.x + box.width - inset, x));

    if (v2 === v1) {
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
   * Drags a slider through a list of values in one continuous press.
   *
   * Running a control down and back up reads as one gesture only if the finger
   * never lifts. The frames are shared out by distance and each leg eases on
   * its own, so the thumb slows into a turn rather than bouncing off it.
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
      throw new Error(`slider drag missed: expected about ${to}, landed on ${landed}`);
    }

    if (opts.hold !== undefined) {
      await this.d.hold(opts.hold);
    }
    this.d.blur();
  }

  // ------------------------------------------------------------------ waiting

  /**
   * Keeps capturing until `done()` holds, so a wait on the app reads as the
   * app working rather than as a cut. Fails loudly past `maxFrames`.
   */
  async captureUntil(
    done: () => Promise<boolean>,
    maxFrames: number,
    what: string,
  ): Promise<number> {
    for (let i = 0; i < maxFrames; i += 1) {
      if (await done()) {
        return i;
      }
      await this.d.frame();
    }
    if (await done()) {
      return maxFrames;
    }
    throw new Error(`gave up after ${maxFrames} frames waiting for ${what}`);
  }

  /**
   * Taps something that starts a download and keeps capturing until the file
   * arrives. The file itself is discarded; the video only needs the app's own
   * progress state.
   */
  async tapForDownload(trigger: Locator, maxFrames = 150): Promise<string> {
    const pending = this.page.waitForEvent("download", { timeout: 180_000 });
    let settled = false;
    const download = pending.then((file) => {
      settled = true;
      return file;
    });

    await this.tap(trigger, {});
    await this.captureUntil(async () => settled, maxFrames, "the export download");

    const file = await download;
    const name = file.suggestedFilename();
    await file.delete();
    return name;
  }
}
