import { matchTone, rgbTriplet } from './picker-color.util';

describe('rgbTriplet', () => {
  it('should give the channels of a six-digit hex colour', () => {
    expect(rgbTriplet('#783C8C')).toBe('120, 60, 140');
  });

  it('should expand a three-digit hex colour', () => {
    expect(rgbTriplet('#f0a')).toBe('255, 0, 170');
  });

  it('should fall back to black for a value that is not a hex colour', () => {
    expect(rgbTriplet('magenta')).toBe('0, 0, 0');
  });
});

describe('matchTone', () => {
  it('should give the design tone back for the design base colour', () => {
    expect(matchTone('#8A5BC2', '#8A5BC2', '#C9A6E8')).toBe('#c9a6e8');
    expect(matchTone('#8A5BC2', '#8A5BC2', '#46256E')).toBe('#46256e');
    expect(matchTone('#8A5BC2', '#8A5BC2', '#1C0E33')).toBe('#1c0e33');
  });

  it('should darken another colour by the design shade factors', () => {
    // #46256E is about half of #8A5BC2 in each channel.
    expect(matchTone('#FF00FF', '#8A5BC2', '#46256E')).toBe('#810091');
  });

  it('should lighten another colour toward white by the design highlight shares', () => {
    // #C0C0C0 is about half-way from #808080 to white.
    expect(matchTone('#000000', '#808080', '#C0C0C0')).toBe('#818181');
  });

  it('should give white for a channel that is white in both design colours', () => {
    expect(matchTone('#000000', '#FF0000', '#FF0000')).toBe('#ff0000');
  });

  it('should return the design tone when the picker colour is not a hex colour', () => {
    expect(matchTone('nope', '#8A5BC2', '#46256E')).toBe('#46256E');
  });
});
