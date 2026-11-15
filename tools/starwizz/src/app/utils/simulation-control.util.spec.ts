import { formatControlValue } from './simulation-control.util';

describe('formatControlValue', () => {
  it('should show an ordinary control as a number with its precision', () => {
    expect(formatControlValue('zoomRate', 2)).toBe('2');
    expect(formatControlValue('starSpeed', 0.6)).toBe('0.6');
  });

  it('should show a clockwise rotation as its speed with a clockwise arrow', () => {
    expect(formatControlValue('rotationRate', 3)).toBe('3 \u21BB');
  });

  it('should show an anticlockwise rotation as its speed, not a negative number', () => {
    expect(formatControlValue('rotationRate', -12)).toBe('12 \u21BA');
  });

  it('should show "Off" when rotation rests in the middle', () => {
    expect(formatControlValue('rotationRate', 0)).toBe('Off');
  });
});
