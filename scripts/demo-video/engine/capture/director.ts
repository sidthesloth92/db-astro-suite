import type { Page } from "@playwright/test";
import { FrameWriter } from "./frame-writer";

/**
 * One caption's span, in global frame numbers across the whole capture.
 *
 * The id rather than the words: the capture's job is to record which line was
 * on screen and for how long, and the wording lives in `captions.ts` so it can
 * be changed without re-capturing.
 */
export interface CaptionRecord {
  id: string;
  start: number;
  end: number;
}

/** One captured clip and where it sits in the global frame timeline. */
export interface ClipRecord {
  id: string;
  file: string;
  start: number;
  frames: number;
}

/** A rectangle in finished-frame pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A span during which one thing on screen is the subject.
 *
 * The capture is the only party that knows where a control actually is when it
 * drives it, so it records the rectangle rather than leaving the edit to guess.
 * Remotion uses it to draw a highlight and to ease the frame toward it.
 */
export interface FocusRecord {
  start: number;
  end: number;
  rect: Rect;
}

/** The manifest Remotion reads back to lay out clips, captions and focus. */
export interface CaptureManifest {
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  clips: ClipRecord[];
  captions: CaptionRecord[];
  focuses: FocusRecord[];
}

/** A point in viewport CSS pixels. */
export interface Point {
  x: number;
  y: number;
}

/** Cubic ease-in-out — the motion curve for cursor travel and slider sweeps. */
export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Linear interpolation. */
export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/**
 * Drives the capture: owns the global frame counter, the caption track, and the
 * synthetic cursor, and hands finished frames to ffmpeg.
 *
 * Every frame is produced deliberately — set state, let the app settle, grab a
 * screenshot — so playback timing is exact rather than whatever a real-time
 * recorder managed to catch. Angular flushes signal changes before the next
 * paint, so waiting two animation frames is enough for a change to be on
 * screen; anything slower (images, fonts, network) is waited for explicitly by
 * the page object before it captures.
 */
export class Director<Id extends string = string> {
  private writer: FrameWriter | null = null;
  private globalFrame = 0;
  private clipStart = 0;
  private clipId = "";
  private clipFile = "";
  private clipIndex = 0;
  private openCaption: { id: string; start: number } | null = null;

  private readonly clips: ClipRecord[] = [];
  private readonly captions: CaptionRecord[] = [];
  private readonly focuses: FocusRecord[] = [];
  private openFocus: { rect: Rect; start: number } | null = null;

  constructor(
    private readonly page: Page,
    private readonly outDir: string,
    private readonly fps: number,
    private readonly scale: number,
  ) {}

  /** Frames elapsed since the capture began. */
  get frameCount(): number {
    return this.globalFrame;
  }

  /** Converts seconds of finished video into a frame count. */
  seconds(count: number): number {
    return Math.round(count * this.fps);
  }

  /** Starts a new clip; every frame from here lands in its own mp4. */
  beginClip(id: string): void {
    if (this.writer !== null) {
      throw new Error(`clip "${this.clipId}" is still open`);
    }
    this.clipIndex += 1;
    this.clipId = id;
    this.clipFile = `${String(this.clipIndex).padStart(2, "0")}-${id}.mp4`;
    this.clipStart = this.globalFrame;
    this.writer = FrameWriter.open(`${this.outDir}/${this.clipFile}`, this.fps);
  }

  /** Closes the current clip and records it in the manifest. */
  async endClip(): Promise<void> {
    if (this.writer === null) {
      throw new Error("no clip is open");
    }
    const frames = await this.writer.close();
    this.writer = null;
    this.clips.push({
      id: this.clipId,
      file: this.clipFile,
      start: this.clipStart,
      frames,
    });
    process.stdout.write(`  clip ${this.clipFile}: ${frames} frames\n`);
  }

  /**
   * Sets the caption from this frame on, closing whichever caption was
   * showing. Because the switch is recorded against the live frame counter,
   * captions cannot drift out of sync with the footage they describe.
   */
  say(id: Id): void {
    this.silence();
    this.openCaption = { id, start: this.globalFrame };
  }

  /**
   * Marks a screen region as the subject from this frame on.
   *
   * The rectangle arrives in CSS pixels — the coordinate space every locator
   * and pointer event uses — and is stored in finished-frame pixels, so the
   * edit can place a highlight without knowing anything about the viewport it
   * was captured at.
   */
  focusOn(cssRect: Rect): void {
    this.blur();
    this.openFocus = {
      start: this.globalFrame,
      rect: {
        x: cssRect.x * this.scale,
        y: cssRect.y * this.scale,
        width: cssRect.width * this.scale,
        height: cssRect.height * this.scale,
      },
    };
  }

  /** Ends the current focus span, if any. */
  blur(): void {
    if (this.openFocus !== null) {
      this.focuses.push({
        rect: this.openFocus.rect,
        start: this.openFocus.start,
        end: this.globalFrame,
      });
      this.openFocus = null;
    }
  }

  /** Clears the caption from this frame on. */
  silence(): void {
    if (this.openCaption !== null) {
      this.captions.push({
        id: this.openCaption.id,
        start: this.openCaption.start,
        end: this.globalFrame,
      });
      this.openCaption = null;
    }
  }

  /** Captures exactly one frame. */
  async frame(): Promise<void> {
    if (this.writer === null) {
      throw new Error("frame() called with no clip open");
    }
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    const buffer = await this.page.screenshot({ type: "png", scale: "device" });
    await this.writer.write(buffer);
    this.globalFrame += 1;
  }

  /** Captures `count` frames with the page left exactly as it is. */
  async hold(count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      await this.frame();
    }
  }

  /** Runs `step(t)` for t across 0..1 over `frames` frames, capturing each. */
  async animate(
    frames: number,
    step: (t: number) => Promise<void> | void,
  ): Promise<void> {
    for (let i = 1; i <= frames; i += 1) {
      await step(easeInOut(i / frames));
      await this.frame();
    }
  }

  /** Positions the synthetic cursor without capturing. */
  async placeCursor(at: Point): Promise<void> {
    await this.page.evaluate(
      (p) => window.__demo.move(p.x, p.y),
      at,
    );
  }

  /** Fades the cursor in or out over `frames` frames. */
  async fadeCursor(to: number, frames: number): Promise<void> {
    await this.animate(frames, async (t) => {
      await this.page.evaluate((v) => window.__demo.setVisible(v), to === 1 ? t : 1 - t);
    });
  }

  /** Glides the cursor from wherever it is to `to`, capturing the travel. */
  async moveCursor(from: Point, to: Point, frames: number): Promise<void> {
    await this.animate(frames, async (t) => {
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      await this.page.evaluate((p) => window.__demo.move(p.x, p.y), { x, y });
      await this.page.mouse.move(x, y);
    });
  }

  /**
   * Presses the cursor at its current spot and lets the ripple expand, without
   * dispatching any event of its own — the caller decides what the press
   * actually does, so this stays usable for clicks, drags and taps alike.
   */
  async pressDown(frames = 3): Promise<void> {
    await this.animate(frames, async (t) => {
      await this.page.evaluate((v) => window.__demo.setPress(v), t);
    });
  }

  /** Releases the cursor and plays the tap ripple out. */
  async pressUp(frames = 8): Promise<void> {
    await this.animate(frames, async (t) => {
      await this.page.evaluate((v) => {
        window.__demo.setPress(1 - v);
        window.__demo.setRipple(v);
      }, t);
    });
    await this.page.evaluate(() => window.__demo.setRipple(0));
  }

  /** The finished manifest, for Remotion. */
  manifest(width: number, height: number): CaptureManifest {
    this.silence();
    this.blur();
    return {
      fps: this.fps,
      width,
      height,
      totalFrames: this.globalFrame,
      clips: this.clips,
      captions: this.captions,
      // Spans shorter than a few frames would read as a flicker rather than
      // emphasis, so they are dropped rather than rendered.
      focuses: this.focuses.filter((focus) => focus.end - focus.start >= 6),
    };
  }
}

declare global {
  interface Window {
    __demo: {
      move(x: number, y: number): void;
      setPress(p: number): void;
      setVisible(v: number): void;
      setRipple(p: number): void;
    };
  }
}
