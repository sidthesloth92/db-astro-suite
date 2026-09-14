/** No-break space: renders as a space but never lets the line break there. */
const NO_BREAK_SPACE = ' ';

/**
 * Joins short meta items ("Sep 13, 2026", a place, "Bortle 9") with " · "
 * separators so a wrapping line may break only before a separator. A line
 * therefore never ends on a dangling "·"; the dot starts the next line with
 * the item it introduces.
 *
 * Empty items are dropped so no separator is left doubled or trailing.
 *
 * @param items The meta items, in reading order.
 * @param isLastKeptWithPrevious Also glue the last item to the one before it,
 *   so a short closing item ("Bortle 9") never sits alone on a line.
 */
export function joinMetaItems(items: readonly string[], isLastKeptWithPrevious = false): string {
  const parts = items.map((item) => item.trim()).filter((item) => item.length > 0);
  return parts.reduce((line, part, i) => {
    if (i === 0) return part;
    const isLast = i === parts.length - 1;
    const before = isLast && isLastKeptWithPrevious ? NO_BREAK_SPACE : ' ';
    return `${line}${before}·${NO_BREAK_SPACE}${part}`;
  }, '');
}
