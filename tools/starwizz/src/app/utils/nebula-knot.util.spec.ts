import { makePhoto } from '../../testing/synthetic-photo.util';
import { LiftStar } from '../models/star-lift.model';
import { isNebulaKnot } from './nebula-knot.util';

const W = 120;
const H = 120;
const AT_CENTRE: LiftStar = { x: 60, y: 60, peak: 0.5, rHalf: 3, rHalo: 14 };

describe('isNebulaKnot', () => {
  it('should recognise a bright patch of the nebula’s own colour as a knot', () => {
    const pixels = makePhoto(W, H, [0.1, 0.3, 0.12], [
      { x: 60, y: 60, amp: 0.5, sigma: 3, color: [0.25, 1, 0.3] },
    ]);
    expect(isNebulaKnot(AT_CENTRE, pixels, W, H)).toBeTrue();
  });

  it('should keep a white star that sits on coloured nebula', () => {
    const pixels = makePhoto(W, H, [0.1, 0.3, 0.12], [{ x: 60, y: 60, amp: 0.6, sigma: 2.5 }]);
    expect(isNebulaKnot(AT_CENTRE, pixels, W, H)).toBeFalse();
  });

  it('should keep a star of a different colour from the nebula around it', () => {
    const pixels = makePhoto(W, H, [0.1, 0.3, 0.12], [
      { x: 60, y: 60, amp: 0.6, sigma: 2.5, color: [1, 0.55, 0.2] },
    ]);
    expect(isNebulaKnot(AT_CENTRE, pixels, W, H)).toBeFalse();
  });

  it('should keep a coloured star on dark sky, where there is no nebula to belong to', () => {
    const pixels = makePhoto(W, H, [0.02, 0.02, 0.02], [
      { x: 60, y: 60, amp: 0.6, sigma: 2.5, color: [0.2, 1, 0.2] },
    ]);
    expect(isNebulaKnot(AT_CENTRE, pixels, W, H)).toBeFalse();
  });
});
