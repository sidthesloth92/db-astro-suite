/**
 * Longest phrase, in characters, whose words are glued together. Anything
 * longer could not fit a narrow card line at all, so it keeps its ordinary
 * spaces and wraps rather than running off the card.
 */
export const KEEP_TOGETHER_MAX_CHARS = 28;

/** No-break space: renders as a space but never lets the line break there. */
const NO_BREAK_SPACE = ' ';

/**
 * Joins the words of a short phrase ("Sep 13, 2026", "San Diego County") with
 * no-break spaces, so a wrapping line moves the whole phrase to the next line
 * instead of splitting it ("San / Diego").
 *
 * @param text The phrase.
 * @param maxChars Longest phrase that is glued; longer text is returned as is.
 */
export function keepWordsTogether(text: string, maxChars = KEEP_TOGETHER_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length > maxChars) return trimmed;
  return trimmed.replace(/\s+/g, NO_BREAK_SPACE);
}

/**
 * Keeps each comma-separated part of a place name whole, so a long location
 * ("Mount Laguna Observatory, San Diego County, California") only wraps after
 * a comma.
 *
 * @param location The user's location text.
 * @param maxChars Longest part that is glued; see {@link keepWordsTogether}.
 */
export function keepPlaceNamesTogether(location: string, maxChars = KEEP_TOGETHER_MAX_CHARS): string {
  return location
    .split(',')
    .map((part) => keepWordsTogether(part, maxChars))
    .filter((part) => part.length > 0)
    .join(', ');
}
