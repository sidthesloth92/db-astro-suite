import { describe, expect, it } from 'vitest';
import { DARK_SKY_SUN_ALT_DEG } from '../models/sky-ui.constants';
import { darkestSkyTime, isDarkSky, skyLuminanceAt, sunAltitudeDeg } from './dark-sky-time.util';

describe('dark-sky-time.util', () => {
  const lat = 40;
  const lon = -74;

  it('keeps the current time on a dark, moonless night', () => {
    const t0 = new Date('2026-10-11T04:00:00Z'); // new Moon, local midnight
    expect(isDarkSky(t0, lat, lon)).toBe(true);
    const c = darkestSkyTime(t0, lat, lon);
    expect(c.moved).toBe(false);
    expect(c.time.getTime()).toBe(t0.getTime());
  });

  it('moves a moonless evening opening to the end of twilight', () => {
    const evening = new Date('2026-10-10T22:30:00Z');
    const c = darkestSkyTime(evening, lat, lon);
    expect(c.moved).toBe(true);
    expect(c.reason).toBe('dusk');
    const hoursAhead = (c.time.getTime() - evening.getTime()) / 3600000;
    expect(hoursAhead).toBeGreaterThan(0.5);
    expect(hoursAhead).toBeLessThan(2.5);
    expect(sunAltitudeDeg(c.time, lat, lon)).toBeLessThanOrEqual(DARK_SKY_SUN_ALT_DEG + 0.5);
  });

  it('stays with dusk when a bright Moon is up all night (nothing darker comes)', () => {
    const evening = new Date('2026-10-24T22:30:00Z'); // Moon 95% lit, up until after sunrise
    const c = darkestSkyTime(evening, lat, lon);
    expect(c.moved).toBe(true);
    expect(c.reason).toBe('dusk');
    const hoursAhead = (c.time.getTime() - evening.getTime()) / 3600000;
    expect(hoursAhead).toBeLessThan(2);
  });

  it('waits for moonset when a first-quarter Moon sets around midnight', () => {
    const evening = new Date('2026-10-18T23:30:00Z');
    const c = darkestSkyTime(evening, lat, lon);
    expect(c.moved).toBe(true);
    expect(c.reason).toBe('moonset');
    const chosen = skyLuminanceAt(c.time, lat, lon);
    const atDusk = skyLuminanceAt(new Date('2026-10-19T00:30:00Z'), lat, lon);
    expect(chosen.moon).toBeLessThan(atDusk.moon / 2);
    expect(isDarkSky(c.time, lat, lon)).toBe(true);
    const hoursAhead = (c.time.getTime() - evening.getTime()) / 3600000;
    expect(hoursAhead).toBeGreaterThan(2);
    expect(hoursAhead).toBeLessThan(9);
  });

  it('ignores the Moon when asked: a bright-Moon evening still just waits for full darkness', () => {
    const evening = new Date('2026-10-24T22:30:00Z');
    const c = darkestSkyTime(evening, lat, lon, false);
    expect(c.moved).toBe(true);
    expect(c.reason).toBe('dusk');
    expect(isDarkSky(c.time, lat, lon)).toBe(true);
    const hoursAhead = (c.time.getTime() - evening.getTime()) / 3600000;
    expect(hoursAhead).toBeLessThan(2);
    // Already dark → unchanged, Moon or not.
    expect(darkestSkyTime(new Date('2026-10-25T04:00:00Z'), lat, lon, false).moved).toBe(false);
  });

  it('falls back to the darkest moment where the night never gets dark (polar summer)', () => {
    const c = darkestSkyTime(new Date('2026-06-21T12:00:00Z'), 69.6, 18.9); // Tromsø
    expect(c.moved).toBe(true);
    expect(c.reason).toBe('midnight');
    expect(sunAltitudeDeg(c.time, 69.6, 18.9)).toBeLessThan(8);
  });
});
