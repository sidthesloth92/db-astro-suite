import { DetectedStar } from '../models/detected-star.model';
import { fluxForManualPeak, fluxSortedInsertIndex } from './manual-star.util';

/** Builds a detected star carrying just the flux and peak these utils read. */
function makeStar(id: number, flux: number, peak: number): DetectedStar {
  return {
    id,
    x: 0,
    y: 0,
    flux,
    peak,
    area: 4,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

const STARS: readonly DetectedStar[] = [
  makeStar(0, 400, 200),
  makeStar(1, 300, 150),
  makeStar(2, 200, 90),
  makeStar(3, 100, 30),
];

describe('fluxForManualPeak', () => {
  it('should borrow the flux of the star whose peak is closest', () => {
    // 95 sits nearest star 2's peak of 90, so a placed star that bright should
    // spike like star 2 does.
    expect(fluxForManualPeak(STARS, 95)).toBe(200);
  });

  it('should match the brightest star for a peak above them all', () => {
    expect(fluxForManualPeak(STARS, 5000)).toBe(400);
  });

  it('should match the faintest star for a peak below them all', () => {
    expect(fluxForManualPeak(STARS, 0)).toBe(100);
  });

  it('should return zero when there are no stars to borrow from', () => {
    expect(fluxForManualPeak([], 120)).toBe(0);
  });

  it('should never invent a flux outside the range the image itself shows', () => {
    // The whole point of matching on peak is to stay on this image's own
    // brightness-to-flux relationship rather than guess at one.
    for (const peak of [0, 25, 60, 140, 190, 900]) {
      expect(STARS.map((s) => s.flux)).toContain(fluxForManualPeak(STARS, peak));
    }
  });
});

describe('fluxSortedInsertIndex', () => {
  it('should place a bright star at the front', () => {
    expect(fluxSortedInsertIndex(STARS, 500)).toBe(0);
  });

  it('should place a faint star at the end', () => {
    expect(fluxSortedInsertIndex(STARS, 50)).toBe(4);
  });

  it('should place a middling star between its neighbours', () => {
    expect(fluxSortedInsertIndex(STARS, 250)).toBe(2);
  });

  it('should keep the list sorted after the insert', () => {
    const flux = 250;
    const next = STARS.slice();
    next.splice(fluxSortedInsertIndex(STARS, flux), 0, makeStar(9, flux, 100));

    const fluxes = next.map((star) => star.flux);
    expect(fluxes).toEqual([...fluxes].sort((a, b) => b - a));
  });

  it('should handle an empty list', () => {
    expect(fluxSortedInsertIndex([], 10)).toBe(0);
  });
});
