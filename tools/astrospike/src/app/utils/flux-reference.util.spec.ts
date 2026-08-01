import { DetectedStar } from '../models/detected-star.model';
import { fluxReferenceFor } from './flux-reference.util';

/** Builds a minimal detected star with the given id and flux. */
function makeStar(id: number, flux: number): DetectedStar {
  return {
    id,
    x: id,
    y: id,
    flux,
    peak: flux / 10,
    area: 4,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

describe('flux-reference.util', () => {
  it('should anchor on the 4th-brightest star of a flux-descending list', () => {
    const stars = [8000, 4000, 2000, 1000, 500, 250].map((f, i) => makeStar(i, f));
    expect(fluxReferenceFor(stars)).toBe(1000);
  });

  it('should stay robust when one monster outlier tops the list', () => {
    // A detected galaxy core at 100x must not become the anchor.
    const stars = [900000, 9000, 8000, 7000, 6000].map((f, i) => makeStar(i, f));
    expect(fluxReferenceFor(stars)).toBe(7000);
  });

  it('should fall back to the faintest star for short lists', () => {
    expect(fluxReferenceFor([makeStar(0, 500), makeStar(1, 300)])).toBe(300);
    expect(fluxReferenceFor([makeStar(0, 500)])).toBe(500);
  });

  it('should return 0 for an empty list', () => {
    expect(fluxReferenceFor([])).toBe(0);
  });
});
