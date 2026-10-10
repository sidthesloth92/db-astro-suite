import { describe, expect, it } from 'vitest';
import { sessionViews } from './portfolio.util';

/** Build a minimal session record for sessionViews(). */
function session(overrides: Record<string, unknown> = {}) {
  return {
    date: '2025-08-02',
    integrationSeconds: 3600,
    lightFrameCount: 12,
    filters: [],
    equipmentIds: [],
    ...overrides,
  };
}

describe('sessionViews — telescope spec line', () => {
  it('formats focal length and f-ratio into a spec line', () => {
    const [view] = sessionViews([session({ focalLengthMm: 250, fRatio: 4.9 })], new Map());
    expect(view.spec).toBe('250mm · f/4.9');
  });

  it('shows focal length alone when f-ratio is missing', () => {
    const [view] = sessionViews([session({ focalLengthMm: 700, fRatio: null })], new Map());
    expect(view.spec).toBe('700mm');
  });

  it('is empty when both focal length and f-ratio are unknown', () => {
    const [view] = sessionViews([session({ focalLengthMm: null, fRatio: null })], new Map());
    expect(view.spec).toBe('');
  });

  it('is empty for older stories that omit the fields entirely', () => {
    const [view] = sessionViews([session()], new Map());
    expect(view.spec).toBe('');
  });
});
