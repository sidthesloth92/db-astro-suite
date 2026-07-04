import { describe, expect, it } from 'vitest';
import { getBoardConfig, isBoardId, BOARD_IDS } from './leaderboards-boards';
import { presentEntry } from './leaderboards-present';
import type { LeaderboardEntry } from './leaderboards.model';

function entry(over: Partial<LeaderboardEntry>): LeaderboardEntry {
  return { rank: 1, key: 'k', label: 'x', value: 0, unit: 'seconds', ...over };
}

describe('board registry', () => {
  it('recognises the nine board ids and rejects others', () => {
    expect(BOARD_IDS).toHaveLength(9);
    expect(isBoardId('hours')).toBe(true);
    expect(isBoardId('telescopes')).toBe(true);
    expect(isBoardId('nope')).toBe(false);
    expect(isBoardId(undefined)).toBe(false);
  });
});

describe('presentEntry', () => {
  it('converts seconds to whole hours for hour boards', () => {
    const r = presentEntry(getBoardConfig('hours'), entry({ value: 7200, label: '@a' }));
    expect(r.value).toBe(2);
    expect(r.unit).toBe('h');
    expect(r.tag).toBeUndefined();
  });

  it('passes counts through for count boards', () => {
    const r = presentEntry(getBoardConfig('frames'), entry({ value: 1234, unit: 'frames' }));
    expect(r.value).toBe(1234);
    expect(r.unit).toBe('frames');
  });

  it('tags targets with their category', () => {
    const r = presentEntry(
      getBoardConfig('target'),
      entry({ value: 5, unit: 'imagers', label: 'M42', meta: { category: 'Emission Nebula' } }),
    );
    expect(r.tag).toBe('Emission Nebula');
    expect(r.unit).toBe('imagers');
  });

  it('maps an equipment sub-type to its display label', () => {
    const r = presentEntry(
      getBoardConfig('cameras'),
      entry({ value: 9, unit: 'users', label: 'ASI2600MM', meta: { subtype: 'mono' } }),
    );
    expect(r.tag).toBe('Mono');
  });

  it('formats a telescope spec sub line', () => {
    const r = presentEntry(
      getBoardConfig('telescopes'),
      entry({ value: 9, unit: 'users', label: 'Esprit 120', meta: { focalLengthMm: 840, fRatio: 7 } }),
    );
    expect(r.sub).toBe('840mm · f/7');
  });

  it('classifies a filter palette tag and converts to hours', () => {
    const r = presentEntry(getBoardConfig('filter'), entry({ value: 3600, label: 'Hα' }));
    expect(r.tag).toBe('Narrowband');
    expect(r.value).toBe(1);
    expect(r.unit).toBe('h');
  });

  it('uses the target designation as the projects sub line', () => {
    const r = presentEntry(
      getBoardConfig('project'),
      entry({ value: 3600, label: '@a', meta: { designation: 'M31', category: 'Galaxy' } }),
    );
    expect(r.sub).toBe('M31');
    expect(r.unit).toBe('h');
  });
});
