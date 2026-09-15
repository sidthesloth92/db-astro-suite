import { hexToRgbChannels } from './hex-rgb.util';

describe('hexToRgbChannels', () => {
  it('should split a six-digit hex colour into its channels', () => {
    expect(hexToRgbChannels('#4632A0')).toBe('70, 50, 160');
    expect(hexToRgbChannels('#ff00ff')).toBe('255, 0, 255');
  });

  it('should expand a three-digit hex colour and ignore an alpha pair', () => {
    expect(hexToRgbChannels('#fff')).toBe('255, 255, 255');
    expect(hexToRgbChannels('#39FF14cc')).toBe('57, 255, 20');
  });

  it('should fall back to black for anything that is not a hex colour', () => {
    expect(hexToRgbChannels('violet')).toBe('0, 0, 0');
    expect(hexToRgbChannels('')).toBe('0, 0, 0');
  });
});
