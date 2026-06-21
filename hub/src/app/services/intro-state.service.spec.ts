import { describe, expect, it } from 'vitest';
import { IntroStateService } from './intro-state.service';

/**
 * Tests for IntroStateService — the per-session "intro already played" gate.
 * The service holds only a signal and has no Angular dependencies, so it is
 * exercised as a plain class without TestBed.
 */
describe('IntroStateService', () => {
  it('should report the intro has not played on a fresh session', () => {
    const service = new IntroStateService();

    expect(service.hasIntroPlayed()).toBe(false);
  });

  it('should report the intro has played after it is marked done', () => {
    const service = new IntroStateService();

    service.markIntroPlayed();

    expect(service.hasIntroPlayed()).toBe(true);
  });

  it('should stay played once marked, even if marked again', () => {
    const service = new IntroStateService();

    service.markIntroPlayed();
    service.markIntroPlayed();

    expect(service.hasIntroPlayed()).toBe(true);
  });
});
