import type { CaptionRecord, CaptureManifest, ClipRecord, FocusRecord } from "./manifest";

/**
 * Which part of a capture a video shows.
 *
 * Each app's demo has two halves — Astrogram's card and its stellar map,
 * AstroSpike's spikes and its Diffusion mode — and the product owner posts them
 * separately as well as together. The halves are cut from the same capture
 * rather than recorded again, so all three videos stay in step.
 */
export type CutId = "full" | "first" | "second";

/** Frames the opening card holds before the app appears. */
export const TITLE_FRAMES = 90;

/** Frames the closing card holds. */
export const OUTRO_FRAMES = 150;

/** Frames the mid-video interstitial holds. */
export const SLIDE_FRAMES = 75;

/** How far the cards overlap their neighbours, so nothing cuts in hard. */
const TITLE_OVERLAP = 12;
const OUTRO_OVERLAP = 10;

/** Where the captured footage starts on the finished timeline. */
export const FOOTAGE_START = TITLE_FRAMES - TITLE_OVERLAP;

/** A clip placed on the finished timeline. */
export interface PlacedClip extends ClipRecord {
  /** First frame of the clip in the finished video. */
  at: number;
}

/** A caption or focus span placed on the finished timeline. */
export interface PlacedSpan {
  id: string;
  start: number;
  end: number;
  /** Where the span began in capture frames, for anything keyed to the halves. */
  captureStart: number;
}

/** Everything the edit needs to lay one cut of one format out. */
export interface Layout {
  clips: PlacedClip[];
  /** Where the interstitial plays, or `null` when this cut has none. */
  slideStart: number | null;
  outroStart: number;
  totalFrames: number;
  /** Places a capture-frame span on the finished timeline, clipped to the cut. */
  place(span: { start: number; end: number }): PlacedSpan | null;
  /** First frame of the second half, in capture frames; `null` if not found. */
  boundary: number | null;
}

/**
 * Lays a cut out: which clips play, where the cards and the interstitial sit,
 * and how capture frames map onto the finished timeline.
 *
 * The interstitial is an edit-time insertion the capture knows nothing about,
 * so the full cut pushes the second half along to make room rather than cover
 * footage. A second-half cut opens on that same slide, which introduces the
 * mode it is about; a first-half cut has no slide at all. Every cut keeps the
 * title and outro cards: each is posted on its own.
 *
 * @param manifest The capture's own record of clips, captions and focus spans.
 * @param cut Which part of the capture to show.
 * @param sliceBefore Id of the clip the second half starts at.
 */
export function buildLayout(
  manifest: CaptureManifest,
  cut: CutId,
  sliceBefore: string,
): Layout {
  const boundaryClip = manifest.clips.find((clip) => clip.id === sliceBefore);
  const boundary = boundaryClip?.start ?? null;
  const hasHalves = boundary !== null;

  const showsFirst = cut !== "second" || !hasHalves;
  const showsSecond = cut !== "first" || !hasHalves;
  const from = cut === "second" && hasHalves ? boundary : 0;
  const to = cut === "first" && hasHalves ? boundary : manifest.totalFrames;

  // The full cut carries the slide in the middle; the second half opens on it.
  const slideBefore = hasHalves && showsFirst && showsSecond ? boundary : null;
  const slideLead = cut === "second" && hasHalves ? SLIDE_FRAMES : 0;

  const at = (frame: number): number => {
    const local = Math.min(Math.max(frame, from), to) - from;
    const pushed = slideBefore !== null && frame >= slideBefore ? local + SLIDE_FRAMES : local;
    return FOOTAGE_START + slideLead + pushed;
  };

  const clips = manifest.clips
    .filter((clip) => clip.start >= from && clip.start < to)
    .map((clip) => ({ ...clip, at: at(clip.start) }));

  const place = (span: { start: number; end: number }): PlacedSpan | null => {
    if (span.end <= from || span.start >= to) {
      return null;
    }
    const start = at(Math.max(span.start, from));
    const end = at(Math.min(span.end, to));
    return end > start ? { id: "", start, end, captureStart: span.start } : null;
  };

  const outroStart = at(to) - OUTRO_OVERLAP;
  return {
    clips,
    slideStart: slideBefore !== null ? at(slideBefore) - SLIDE_FRAMES : slideLead > 0 ? FOOTAGE_START : null,
    outroStart,
    totalFrames: outroStart + OUTRO_FRAMES,
    place,
    boundary,
  };
}

/** Caption spans of this cut, on the finished timeline. */
export function placeCaptions(
  layout: Layout,
  captions: readonly CaptionRecord[],
): PlacedSpan[] {
  return captions
    .map((caption) => {
      const placed = layout.place(caption);
      return placed === null ? null : { ...placed, id: caption.id };
    })
    .filter((span): span is PlacedSpan => span !== null);
}

/** Focus spans of this cut, on the finished timeline. */
export function placeFocuses(layout: Layout, focuses: readonly FocusRecord[]): FocusRecord[] {
  return focuses
    .map((focus) => {
      const placed = layout.place(focus);
      return placed === null ? null : { ...focus, start: placed.start, end: placed.end };
    })
    .filter((focus): focus is FocusRecord => focus !== null);
}
