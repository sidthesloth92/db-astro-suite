import { makePhoto, withFilament } from '../../testing/synthetic-photo.util';
import { brightnessOf } from '../utils/star-detect.util';
import { RingProfile } from './ring-profile.model';

const W = 200;
const H = 200;
const SKY = 0.1;

describe('RingProfile', () => {
  it('should read the same level all the way round a star', () => {
    const photo = makePhoto(W, H, [SKY, SKY, SKY], [{ x: 100, y: 100, amp: 0.6, sigma: 3 }]);
    const rings = new RingProfile(brightnessOf(photo, W, H), W, H, 30);
    rings.centreOn(100, 100);

    expect(rings.high(4) - rings.low(4)).toBeLessThan(0.03);
    expect(rings.low(4)).toBeGreaterThan(SKY + 0.2);
    expect(rings.low(20)).toBeCloseTo(SKY, 2);
  });

  it('should see a filament crossing the ring in its brighter part only', () => {
    const sky = makePhoto(W, H, [SKY, SKY, SKY]);
    const photo = withFilament(sky, W, H, { x: 100, y: 100, angle: 90, amp: 0.3, sigma: 6 });
    const rings = new RingProfile(brightnessOf(photo, W, H), W, H, 30);
    rings.centreOn(100, 100);

    expect(rings.low(20)).toBeLessThan(SKY + 0.02);
    expect(rings.high(20)).toBeGreaterThan(SKY + 0.1);
  });

  it('should read around the new point after being moved', () => {
    const photo = makePhoto(W, H, [SKY, SKY, SKY], [{ x: 60, y: 60, amp: 0.6, sigma: 3 }]);
    const rings = new RingProfile(brightnessOf(photo, W, H), W, H, 30);

    rings.centreOn(60, 60);
    const onStar = rings.low(3);
    rings.centreOn(140, 140);
    const onSky = rings.low(3);

    expect(onStar).toBeGreaterThan(SKY + 0.2);
    expect(onSky).toBeCloseTo(SKY, 2);
  });

  it('should keep reading the part of a ring that is still on the image', () => {
    const lum = brightnessOf(makePhoto(W, H, [SKY, SKY, SKY]), W, H);
    const rings = new RingProfile(lum, W, H, 30);
    rings.centreOn(0, 0);

    expect(rings.low(10)).toBeCloseTo(SKY, 2);
  });

  it('should report no level for a ring that lies wholly off the image', () => {
    const rings = new RingProfile(new Float32Array(36).fill(SKY), 6, 6, 12);
    rings.centreOn(3, 3);

    expect(rings.low(12)).toBeNaN();
    expect(rings.high(12)).toBeNaN();
  });

  it('should refuse a radius beyond the one it was built for', () => {
    const rings = new RingProfile(new Float32Array(W * H), W, H, 10);
    rings.centreOn(100, 100);

    expect(() => rings.low(11)).toThrowError(RangeError);
    expect(() => rings.high(0)).toThrowError(RangeError);
  });
});
