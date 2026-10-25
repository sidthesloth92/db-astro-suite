import { describe, expect, it } from 'vitest';
import { validateStory } from './story-validate';
import { StoryValidationError } from './celestory.error';
import {
  MAX_ALIASES,
  MAX_FILTER_NAME_LENGTH,
  MAX_IMAGE_REF_LENGTH,
  MAX_NAME_LENGTH,
  MAX_OBSERVER_LENGTH,
} from './story.constants';
import sample from '../../app/models/sample-celestory.json';

/** A deep copy of the bundled sample story (a real CLI-shaped file). */
function sampleStory(): Record<string, unknown> {
  return structuredClone(sample) as unknown as Record<string, unknown>;
}

/** The sample story with its first target's fields overridden. */
function withTarget(overrides: Record<string, unknown>): Record<string, unknown> {
  const story = sampleStory();
  const targets = story['targets'] as Record<string, unknown>[];
  return { ...story, targets: [{ ...targets[0], ...overrides }, ...targets.slice(1)] };
}

describe('validateStory text limits', () => {
  it('accepts the sample story produced by the CLI', () => {
    expect(() => validateStory(sampleStory())).not.toThrow();
  });

  it('accepts a target name exactly at the limit and rejects one over it', () => {
    expect(() => validateStory(withTarget({ displayName: 'x'.repeat(MAX_NAME_LENGTH) }))).not.toThrow();
    expect(() => validateStory(withTarget({ displayName: 'x'.repeat(MAX_NAME_LENGTH + 1) }))).toThrow(
      StoryValidationError,
    );
  });

  it('names the offending field in the error', () => {
    expect(() => validateStory(withTarget({ designation: 'x'.repeat(MAX_NAME_LENGTH + 1) }))).toThrow(
      /targets\[0\]\.designation/,
    );
  });

  it('rejects too many aliases', () => {
    const aliases = Array.from({ length: MAX_ALIASES + 1 }, (_, i) => `A${i}`);
    expect(() => validateStory(withTarget({ aliases }))).toThrow(StoryValidationError);
  });

  it('rejects an over-long filter name', () => {
    const filters = [{ name: 'f'.repeat(MAX_FILTER_NAME_LENGTH + 1), seconds: 60, frames: 1 }];
    expect(() => validateStory(withTarget({ filters }))).toThrow(StoryValidationError);
  });

  it('rejects an over-long image reference', () => {
    expect(() => validateStory(withTarget({ image: 'h'.repeat(MAX_IMAGE_REF_LENGTH + 1) }))).toThrow(
      StoryValidationError,
    );
  });

  it('rejects over-long observer and site lines, which are shown publicly', () => {
    const long = 'o'.repeat(MAX_OBSERVER_LENGTH + 1);
    expect(() => validateStory({ ...sampleStory(), observer: long })).toThrow(StoryValidationError);
    expect(() => validateStory({ ...sampleStory(), site: long })).toThrow(StoryValidationError);
  });
});
