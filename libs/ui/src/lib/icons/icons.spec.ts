import { chevronRightIcon } from './chevron-right.icon';
import { downloadIcon } from './download.icon';
import { mountainIcon } from './mountain.icon';

/**
 * Spot-check the per-glyph data consts. The generic `IconComponent`
 * has its own behavioural spec under `lib/icon/icon.component.spec.ts`;
 * these checks just guarantee the data shape stays valid (non-empty
 * body string, expected fill for solid icons).
 */
describe('Icon data consts', () => {
  it('should expose a non-empty body for line icons (download)', () => {
    expect(downloadIcon.name).toBe('download');
    expect(downloadIcon.body.length).toBeGreaterThan(0);
    expect(downloadIcon.fill).toBeUndefined();
  });

  it('should expose a non-empty body for line icons (chevron-right)', () => {
    expect(chevronRightIcon.name).toBe('chevron-right');
    expect(chevronRightIcon.body.length).toBeGreaterThan(0);
    expect(chevronRightIcon.fill).toBeUndefined();
  });

  it('should expose fill="currentColor" for solid icons (mountain)', () => {
    expect(mountainIcon.name).toBe('mountain');
    expect(mountainIcon.body.length).toBeGreaterThan(0);
    expect(mountainIcon.fill).toBe('currentColor');
  });
});
