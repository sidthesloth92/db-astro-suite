import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkyTimeStore } from './sky-time-store.service';

describe('SkyTimeStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T22:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is live by default and tracks the wall clock', () => {
    const store = new SkyTimeStore();
    expect(store.isLive()).toBe(true);
    vi.setSystemTime(new Date('2026-10-24T22:00:10Z'));
    expect(store.now().toISOString()).toBe('2026-10-24T22:00:10.000Z');
  });

  it('runs faster than real time when the rate is raised', () => {
    const store = new SkyTimeStore();
    store.setRate(60);
    vi.setSystemTime(new Date('2026-10-24T22:00:10Z'));
    expect(store.now().toISOString()).toBe('2026-10-24T22:10:00.000Z');
    expect(store.isLive()).toBe(false);
  });

  it('pauses without jumping and resumes from the same instant', () => {
    const store = new SkyTimeStore();
    store.setRate(600);
    vi.setSystemTime(new Date('2026-10-24T22:00:06Z'));
    store.togglePause();
    const paused = store.now().getTime();
    vi.setSystemTime(new Date('2026-10-24T22:05:00Z'));
    expect(store.now().getTime()).toBe(paused);
    store.togglePause();
    expect(store.rate()).toBe(1);
    expect(store.now().getTime()).toBe(paused);
  });

  it('shifts, jumps and returns to live', () => {
    const store = new SkyTimeStore();
    store.shiftBy(3600 * 1000);
    expect(store.now().toISOString()).toBe('2026-10-24T23:00:00.000Z');
    expect(store.isLive()).toBe(false);
    store.setTime(new Date('2026-10-10T04:00:00Z'));
    expect(store.now().toISOString()).toBe('2026-10-10T04:00:00.000Z');
    store.resetToNow();
    expect(store.isLive()).toBe(true);
    expect(store.now().toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it('publishes the time signal once per simulated second', () => {
    const store = new SkyTimeStore();
    store.tick();
    const first = store.time();
    vi.setSystemTime(new Date('2026-10-24T22:00:00.400Z'));
    store.tick();
    expect(store.time()).toBe(first);
    vi.setSystemTime(new Date('2026-10-24T22:00:01.100Z'));
    store.tick();
    expect(store.time()).not.toBe(first);
  });
});
