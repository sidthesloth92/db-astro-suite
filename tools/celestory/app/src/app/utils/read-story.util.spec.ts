import { describe, expect, it } from 'vitest';
import { SUPPORTED_STORY_SCHEMA_VERSION } from '../models/story.constants';
import { parseStoryText } from './read-story.util';

/** Minimal story JSON accepted by parseStoryText. */
function validStoryJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: SUPPORTED_STORY_SCHEMA_VERSION,
    generatedAt: '2026-06-17T00:00:00Z',
    tool: { name: 'celestory', version: '1.0.0' },
    summary: { totalIntegrationSeconds: 3600, targetCount: 1, nightCount: 1, lightFrameCount: 10 },
    targets: [],
    equipment: [],
    ...overrides,
  });
}

describe('parseStoryText', () => {
  it('accepts a well-formed current-schema story', () => {
    const result = parseStoryText(validStoryJson());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.story.summary.targetCount).toBe(1);
    }
  });

  it('rejects invalid JSON', () => {
    const result = parseStoryText('{ not json');
    expect(result).toEqual({ ok: false, error: expect.stringContaining('valid celestory.json') });
  });

  it('rejects a JSON object missing the summary block', () => {
    const result = parseStoryText(JSON.stringify({ schemaVersion: SUPPORTED_STORY_SCHEMA_VERSION }));
    expect(result.ok).toBe(false);
  });

  it('rejects an older-schema story with an upgrade message', () => {
    const result = parseStoryText(validStoryJson({ schemaVersion: SUPPORTED_STORY_SCHEMA_VERSION - 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('older Celestory CLI');
      expect(result.error).toContain('1.0.0');
    }
  });
});
