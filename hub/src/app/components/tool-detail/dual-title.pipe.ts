import { Pipe, PipeTransform } from '@angular/core';

/**
 * Splits a heading into `[accent, rest]` for the two-tone treatment — the
 * leading `accent` segment is rendered in the accent colour, the remainder
 * stays white. Mirrors the prototype's `splitDuo`: it breaks at the space
 * nearest the middle so the two colours stay visually balanced, and falls
 * back to the midpoint character for single words (e.g. `FEATURES` →
 * `FEAT` + `URES`, `OUTPUT` → `OUT` + `PUT`). For space splits the remainder
 * keeps its leading space so the words stay separated when re-joined.
 */
@Pipe({ name: 'dualTitle', standalone: true })
export class DualTitlePipe implements PipeTransform {
  /** Returns the accent (leading) segment and the remainder. */
  transform(value: string): readonly [accent: string, rest: string] {
    const text = value ?? '';
    if (text.length === 0) {
      return ['', ''];
    }
    const mid = Math.ceil(text.length / 2);
    let splitIndex = -1;
    let best = Infinity;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        const distance = Math.abs(i - mid);
        if (distance < best) {
          best = distance;
          splitIndex = i;
        }
      }
    }
    if (splitIndex === -1) {
      splitIndex = mid;
    }
    return [text.slice(0, splitIndex), text.slice(splitIndex)];
  }
}
