import type { CaptionRecord } from "./manifest";

/** A caption's span on the finished timeline, after grouping. */
export interface CaptionSpan {
  id: string;
  start: number;
  end: number;
}

/**
 * Groups the capture's caption track into the lines the video actually shows.
 *
 * A beat says one id per thing it demonstrates, which is the right grain for
 * the capture: it records exactly when each control was driven. The video often
 * wants fewer, longer lines than that — four slider beats read better under one
 * "adjust these" caption than as four captions flashing by. Consecutive records
 * that map to the same caption become one span, so the wording and the grouping
 * are both edit-side decisions and neither needs a re-capture.
 *
 * @param records The capture's caption track, in playback order.
 * @param captionFor Which caption each said id belongs to.
 */
export function mergeCaptions(
  records: readonly CaptionRecord[],
  captionFor: Readonly<Record<string, string>>,
): CaptionSpan[] {
  const spans: CaptionSpan[] = [];
  for (const record of records) {
    const id = captionFor[record.id] ?? record.id;
    const open = spans[spans.length - 1];
    if (open && open.id === id && record.start <= open.end) {
      open.end = Math.max(open.end, record.end);
      continue;
    }
    spans.push({ id, start: record.start, end: record.end });
  }
  return spans;
}
