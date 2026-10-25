import { describe, expect, it } from 'vitest';
import { toStoredStory, withStoredObserver } from './stored-story.util';

/** An uploaded story carrying private fields alongside public ones. */
function uploaded(): Record<string, unknown> {
  return {
    schemaVersion: 3,
    observer: 'Vera C. — Atacama',
    site: 'Cerro Pachón',
    installId: '0123456789abcdef0123456789abcdef',
    dataFingerprint: 'a'.repeat(64),
    profileId: 'vera',
    targets: [{ id: 'm31', ra: 10.68, dec: 41.27 }],
    duplicates: [{ paths: ['/Users/vera/astro/m31_001.fits'] }],
    skipped: [{ path: '/Users/vera/astro/broken.fits', reason: 'bad header' }],
    futureField: { kept: true },
  };
}

describe('toStoredStory', () => {
  it('removes the per-install identity fields', () => {
    const stored = toStoredStory(uploaded()) as Record<string, unknown>;
    expect(stored).not.toHaveProperty('installId');
    expect(stored).not.toHaveProperty('dataFingerprint');
    expect(stored).not.toHaveProperty('profileId');
  });

  it('empties the lists that can hold local file paths', () => {
    const stored = toStoredStory(uploaded()) as Record<string, unknown>;
    expect(stored['duplicates']).toEqual([]);
    expect(stored['skipped']).toEqual([]);
    expect(JSON.stringify(stored)).not.toContain('/Users/');
  });

  it('keeps everything else, including sky coordinates and unknown fields', () => {
    const stored = toStoredStory(uploaded()) as Record<string, unknown>;
    expect(stored['observer']).toBe('Vera C. — Atacama');
    expect(stored['targets']).toEqual([{ id: 'm31', ra: 10.68, dec: 41.27 }]);
    expect(stored['futureField']).toEqual({ kept: true });
  });

  it('does not modify the uploaded object', () => {
    const original = uploaded();
    toStoredStory(original);
    expect(original['installId']).toBe('0123456789abcdef0123456789abcdef');
    expect(original['skipped']).toHaveLength(1);
  });

  it('passes non-objects through unchanged', () => {
    expect(toStoredStory(null)).toBeNull();
    expect(toStoredStory('x')).toBe('x');
  });
});

describe('withStoredObserver', () => {
  it('keeps the saved name when the re-uploaded file has none (CLI files never do)', () => {
    expect(withStoredObserver({ targets: [] }, 'Vera C.')).toEqual({ targets: [], observer: 'Vera C.' });
    expect(withStoredObserver({ observer: '  ' }, 'Vera C.')).toEqual({ observer: 'Vera C.' });
  });

  it('lets a name in the new file win', () => {
    expect(withStoredObserver({ observer: 'Vera R.' }, 'Vera C.')).toEqual({ observer: 'Vera R.' });
  });

  it('leaves the story alone when nothing was saved', () => {
    const story = { targets: [] };
    expect(withStoredObserver(story, null)).toBe(story);
  });
});
