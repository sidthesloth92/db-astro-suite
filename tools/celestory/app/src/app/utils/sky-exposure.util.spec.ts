import { describe, expect, it } from 'vitest';
import { DEFAULT_SKY_LOOK, MOON_SUN_RATIO, SUN_INTENSITY } from '../models/sky-render.constants';
import { exposureForSky, moonZenithLuminance } from './sky-exposure.util';
import { zenithLuminance } from './sky-scatter.util';

const noMoon = { x: 0, y: 0, z: -1 };

describe('sky-exposure.util', () => {
  it('uses the full night exposure under a dark, moonless sky', () => {
    expect(exposureForSky(-40, noMoon, 0, DEFAULT_SKY_LOOK)).toBeCloseTo(DEFAULT_SKY_LOOK.nightExposure, 1);
  });

  it('keeps a noon zenith sky within the displayable range', () => {
    const e = exposureForSky(50, noMoon, 0, DEFAULT_SKY_LOOK);
    const displayed = zenithLuminance(50) * e;
    expect(displayed).toBeGreaterThan(0.1);
    expect(displayed).toBeLessThan(6);
  });

  it('makes a civil-twilight sky far brighter than the Milky Way', () => {
    const e = exposureForSky(-5, noMoon, 0, DEFAULT_SKY_LOOK);
    const sky = zenithLuminance(-5) * e;
    const milkyWay = 0.0008 * e;
    expect(sky / milkyWay).toBeGreaterThan(30);
  });

  it('lights the zenith to a few thousandths of a cd/m² under a high full Moon', () => {
    const l = moonZenithLuminance({ x: 0, y: 0.5, z: 0.866 }, SUN_INTENSITY * MOON_SUN_RATIO);
    expect(l).toBeGreaterThan(0.003);
    expect(l).toBeLessThan(0.02);
  });

  it('stops down under a full Moon so the sky does not read as daylight', () => {
    const dark = exposureForSky(-40, noMoon, 0, DEFAULT_SKY_LOOK);
    const moonlit = exposureForSky(-40, { x: 0, y: 0.5, z: 0.866 }, SUN_INTENSITY * MOON_SUN_RATIO, DEFAULT_SKY_LOOK);
    expect(moonlit).toBeLessThan(dark / 2.5);
    expect(moonlit).toBeGreaterThan(dark / 20);
    // …but the moonlit sky still displays brighter than the dark one.
    const moonZenith = 0.0025;
    expect(moonZenith * moonlit).toBeGreaterThan(DEFAULT_SKY_LOOK.airglow * dark);
  });
});
