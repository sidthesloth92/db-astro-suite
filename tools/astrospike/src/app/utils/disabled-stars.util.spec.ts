import { DetectedStar } from '../models/detected-star.model';
import { selectDisabledStars } from './disabled-stars.util';

/** Builds a flux-descending list of `count` stars with ids 0..count-1. */
function makeStars(count: number): DetectedStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: i,
    y: i,
    flux: 100 - i,
    peak: 1,
    area: 5,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  }));
}

describe('selectDisabledStars', () => {
  it('should return the stars inside the cut that are not being rendered', () => {
    const stars = makeStars(5);
    const rendered = [stars[0], stars[2]];

    const disabled = selectDisabledStars(stars, 3, rendered);

    expect(disabled.map((star) => star.id)).toEqual([1]);
  });

  it('should ignore stars outside the cut, which nobody switched off', () => {
    const stars = makeStars(5);

    const disabled = selectDisabledStars(stars, 2, [stars[0], stars[1]]);

    expect(disabled).toEqual([]);
  });

  it('should still report a star switched off while others are force-enabled', () => {
    const stars = makeStars(5);
    // Star 4 was force-enabled from beyond the cut, star 0 was switched off.
    const rendered = [stars[1], stars[2], stars[4]];

    const disabled = selectDisabledStars(stars, 3, rendered);

    expect(disabled.map((star) => star.id)).toEqual([0]);
  });

  it('should return nothing when the cut is empty', () => {
    const stars = makeStars(3);

    expect(selectDisabledStars(stars, 0, [])).toEqual([]);
  });

  it('should return nothing when no stars have been detected', () => {
    expect(selectDisabledStars([], 10, [])).toEqual([]);
  });

  it('should not mutate the star lists it is given', () => {
    const stars = makeStars(3);
    const rendered = [stars[0]];

    selectDisabledStars(stars, 3, rendered);

    expect(stars.length).toBe(3);
    expect(rendered.length).toBe(1);
  });
});
