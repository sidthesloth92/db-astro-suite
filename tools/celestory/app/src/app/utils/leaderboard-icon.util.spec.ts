import { describe, expect, it } from 'vitest';
import { leaderboardIconSvg } from './leaderboard-icon.util';

describe('leaderboardIconSvg', () => {
  it('wraps a known glyph in an svg with the lic class', () => {
    const svg = leaderboardIconSvg('clock');
    expect(svg).toContain('<svg class="lic"');
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('M12 7v5l3.5 2');
  });

  it('renders each catalog glyph as svg markup', () => {
    for (const name of [
      'target',
      'gear',
      'camera',
      'mount',
      'telescope',
      'calendar',
      'frames',
      'filter',
      'project',
    ] as const) {
      expect(leaderboardIconSvg(name)).toContain('<svg');
    }
  });
});
