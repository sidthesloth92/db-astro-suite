import { describe, expect, it } from 'vitest';
import { leaderboardBackdrop, motifSvg } from './leaderboard-motif.util';
import type { MotifId } from '../models/leaderboard-board.model';

const MOTIFS: readonly MotifId[] = [
  'clock',
  'galaxy',
  'sensor',
  'equatorial',
  'blueprint',
  'calendar',
  'stack',
  'spectrum',
  'timeline',
];

describe('motifSvg', () => {
  it('builds a wrapped svg tinted with the accent for every motif', () => {
    for (const motif of MOTIFS) {
      const svg = motifSvg(motif, '#ff2a7b', '255,42,123');
      expect(svg).toContain('<svg class="lb-motif"');
      expect(svg).toContain('#ff2a7b');
    }
  });

  it('colours the spectrum filter wheel from the supplied swatches', () => {
    const svg = motifSvg('spectrum', '#22d3c5', '34,211,197', ['#ff4d6d', '#e9edf4']);
    expect(svg).toContain('#ff4d6d');
    expect(svg).toContain('#e9edf4');
  });
});

describe('leaderboardBackdrop', () => {
  it('emits a stronger gradient when bold and embeds the accent rgb', () => {
    const bold = leaderboardBackdrop('255,42,123', true);
    const soft = leaderboardBackdrop('255,42,123', false);
    expect(bold).toContain('rgba(255,42,123,0.26)');
    expect(soft).toContain('rgba(255,42,123,0.14)');
  });
});
