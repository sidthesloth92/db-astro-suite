/** Frames a caption is allowed to stay on screen, before its span is applied. */
const MIN_HOLD = 150;
const MAX_HOLD = 300;

/** Frames of reading time allowed per character, at 30 fps. */
const PER_CHARACTER = 1.6;

/**
 * How long a caption stays up when it must not sit over the app for the whole
 * beat.
 *
 * On the phone cut the caption shares the lower half of the screen with the
 * controls sheet, so a caption held for a twelve-second slider beat covers the
 * control it is describing. It reads, then leaves: five seconds for a short
 * line, more for a long one, and never longer than the beat it belongs to.
 *
 * @param text The caption as it appears on screen.
 * @param span The beat's own length in frames.
 */
export function captionHold(text: string, span: number): number {
  const readable = MIN_HOLD + PER_CHARACTER * Math.max(0, text.length - 60);
  return Math.min(span, Math.max(MIN_HOLD, Math.min(MAX_HOLD, Math.round(readable))));
}
