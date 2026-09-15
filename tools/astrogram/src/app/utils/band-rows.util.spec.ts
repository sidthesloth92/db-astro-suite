import { bandRowBreak } from './band-rows.util';

describe('bandRowBreak', () => {
  it('should keep a short run of bands on one line', () => {
    expect(bandRowBreak(3)).toBe(0);
    expect(bandRowBreak(4)).toBe(0);
  });

  it('should split a long run into two balanced rows, the longer one first', () => {
    expect(bandRowBreak(7)).toBe(4);
    expect(bandRowBreak(6)).toBe(3);
    expect(bandRowBreak(5)).toBe(3);
  });

  it('should honour a custom row length', () => {
    expect(bandRowBreak(6, 6)).toBe(0);
  });
});
