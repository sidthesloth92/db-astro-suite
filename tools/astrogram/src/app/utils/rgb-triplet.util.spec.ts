import { rgbTriplet } from './rgb-triplet.util';

describe('rgbTriplet', () => {
  it('should list the channels of a six-digit hex colour', () => {
    expect(rgbTriplet('#B97DFF')).toBe('185, 125, 255');
    expect(rgbTriplet('#000000')).toBe('0, 0, 0');
  });

  it('should expand shorthand and ignore an alpha channel', () => {
    expect(rgbTriplet('#fff')).toBe('255, 255, 255');
    expect(rgbTriplet('#ff00ff80')).toBe('255, 0, 255');
  });

  it('should return an empty string for anything that is not a hex colour', () => {
    expect(rgbTriplet('magenta')).toBe('');
    expect(rgbTriplet('')).toBe('');
  });
});
