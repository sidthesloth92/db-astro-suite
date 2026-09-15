import type { HeroNameParts } from '../models/hero-name-parts.model';
import { HERO_DESCRIPTOR_WORDS } from './hero-name.constants';

/**
 * Splits an object name into a large proper name and a smaller descriptor for
 * a two-tier hero.
 *
 * Splitting after the first word broke multi-word names ("North." over
 * "America Nebula Complex"). The split falls before the first descriptor word
 * after the start instead — "Rosette" / "Nebula", "Heart and Soul" / "Nebula",
 * "North America" / "Nebula Complex". A name with no descriptor ("Andromeda",
 * "Pillars of Creation") is all proper name and stays whole.
 *
 * @param name The object name as the user typed it.
 */
export function splitHeroName(name: string): HeroNameParts {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
  const at = words.findIndex(
    (word, i) => i > 0 && HERO_DESCRIPTOR_WORDS.has(word.toLowerCase().replace(/[^\p{L}]/gu, '')),
  );
  if (at === -1) return { primary: words.join(' '), rest: '' };
  return { primary: words.slice(0, at).join(' '), rest: words.slice(at).join(' ') };
}
