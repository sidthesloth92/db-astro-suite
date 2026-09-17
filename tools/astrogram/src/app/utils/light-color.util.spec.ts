import { isLightColor } from './light-color.util';

describe('isLightColor', () => {
  it('should treat white and near-white band colours as light', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#FFF')).toBe(true);
    expect(isLightColor('#f5f5f0cc')).toBe(true);
  });

  it('should treat saturated filter colours as dark enough for light paper', () => {
    expect(isLightColor('#e63c64')).toBe(false);
    expect(isLightColor('#4fc3f7')).toBe(false);
    expect(isLightColor('#ff0000')).toBe(false);
    expect(isLightColor('#00ff00')).toBe(false);
  });

  it('should leave anything that is not a hex colour untouched', () => {
    expect(isLightColor('white')).toBe(false);
    expect(isLightColor('')).toBe(false);
  });
});
