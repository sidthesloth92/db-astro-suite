import { formatSceneControlValue } from './scene3d-control.util';

describe('formatSceneControlValue', () => {
  it('should show an ordinary slider as a number at its own precision', () => {
    expect(formatSceneControlValue('speed', 7.5)).toBe('7.5');
    expect(formatSceneControlValue('starAmount', 100)).toBe('100');
    expect(formatSceneControlValue('starSize', 1)).toBe('1.0');
  });

  it('should say Off when Rotation rests in the middle', () => {
    expect(formatSceneControlValue('rotation', 0)).toBe('Off');
  });

  it('should show how fast and which way the view turns', () => {
    expect(formatSceneControlValue('rotation', 4)).toBe('4\u00B0/s \u21BB');
    expect(formatSceneControlValue('rotation', -7)).toBe('7\u00B0/s \u21BA');
  });
});
