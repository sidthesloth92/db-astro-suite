import { describe, expect, it } from 'vitest';
import { assertStorySize, exceedsStoryLimit } from './story-size.util';
import { PayloadTooLargeError } from './celestory.error';
import { MAX_STORY_BYTES } from './story.constants';

describe('exceedsStoryLimit', () => {
  it('allows a declared size up to the limit and refuses one byte over', () => {
    expect(exceedsStoryLimit(String(MAX_STORY_BYTES))).toBe(false);
    expect(exceedsStoryLimit(String(MAX_STORY_BYTES + 1))).toBe(true);
  });

  it('leaves missing or malformed sizes to the after-parse check', () => {
    expect(exceedsStoryLimit(undefined)).toBe(false);
    expect(exceedsStoryLimit('abc')).toBe(false);
  });
});

describe('assertStorySize', () => {
  it('accepts a normal story', () => {
    expect(() => assertStorySize({ schemaVersion: 3, targets: [] })).not.toThrow();
  });

  it('refuses a story whose JSON is over the limit', () => {
    const huge = { padding: 'x'.repeat(MAX_STORY_BYTES) };
    expect(() => assertStorySize(huge)).toThrow(PayloadTooLargeError);
  });
});
