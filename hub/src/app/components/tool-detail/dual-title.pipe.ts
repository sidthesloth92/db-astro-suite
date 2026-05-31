import { Pipe, PipeTransform } from '@angular/core';

/**
 * Splits a heading into `[firstWord, remainder]` so the leading word can be
 * rendered in the accent colour while the remainder stays white — mirroring
 * the dual-colour treatment of the hero wordmark. The remainder keeps its
 * leading space so the words stay separated when re-joined in the template.
 */
@Pipe({ name: 'dualTitle', standalone: true })
export class DualTitlePipe implements PipeTransform {
  /** Returns the leading word and the (space-prefixed) remainder. */
  transform(value: string): readonly [accent: string, rest: string] {
    const text = value ?? '';
    const spaceIndex = text.indexOf(' ');
    return spaceIndex === -1
      ? [text, '']
      : [text.slice(0, spaceIndex), text.slice(spaceIndex)];
  }
}
