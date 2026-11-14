import { turnArrow } from './turn-arrow.util';

describe('turnArrow', () => {
  it('should point clockwise for a positive rotation', () => {
    expect(turnArrow(4)).toBe('\u21BB');
  });

  it('should point anticlockwise for a negative rotation', () => {
    expect(turnArrow(-4)).toBe('\u21BA');
  });
});
