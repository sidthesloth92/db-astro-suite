import { describe, expect, it } from 'vitest';

import { FILTER_FALLBACK, FILTER_META } from '../models/filter.constants';
import { filterColor, filterColorMap } from './filter-color.util';

describe('filterColorMap', () => {
  it('should give two unknown filters different colours', () => {
    const colors = filterColorMap(['SV220', 'D2']);
    expect(colors.get('SV220')).toBeDefined();
    expect(colors.get('D2')).toBeDefined();
    expect(colors.get('SV220')).not.toBe(colors.get('D2'));
  });

  it('should assign the same colours regardless of input order', () => {
    const a = filterColorMap(['SV220', 'D2', 'L-eXtreme']);
    const b = filterColorMap(['L-eXtreme', 'SV220', 'D2']);
    for (const name of ['SV220', 'D2', 'L-eXtreme']) {
      expect(a.get(name)).toBe(b.get(name));
    }
  });

  it('should not assign palette slots to known filters', () => {
    const colors = filterColorMap(['Hα', 'OIII', 'SV220']);
    expect(colors.has('Hα')).toBe(false);
    expect(colors.has('OIII')).toBe(false);
    expect(colors.get('SV220')).toBe(FILTER_FALLBACK);
  });

  it('should keep unknown assignments distinct from signature colours', () => {
    const signature = new Set(Object.values(FILTER_META).map((m) => m.color));
    const colors = filterColorMap(['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8']);
    for (const c of colors.values()) {
      expect(signature.has(c)).toBe(false);
    }
  });
});

describe('filterColor', () => {
  it('should keep signature colours for known filters', () => {
    expect(filterColor('Hα')).toBe(FILTER_META['Hα'].color);
    expect(filterColor('OIII', filterColorMap(['OIII', 'D2']))).toBe(FILTER_META['OIII'].color);
  });

  it('should resolve unknown names through the provided map', () => {
    const colors = filterColorMap(['SV220', 'D2']);
    expect(filterColor('D2', colors)).toBe(colors.get('D2'));
    expect(filterColor('SV220', colors)).toBe(colors.get('SV220'));
  });

  it('should fall back to the default mint without a map', () => {
    expect(filterColor('SV220')).toBe(FILTER_FALLBACK);
  });

  it('should colour OSC and No Filter as known filters', () => {
    expect(filterColor('OSC')).toBe(FILTER_META['OSC'].color);
    expect(filterColor('No Filter')).toBe(FILTER_META['No Filter'].color);
  });
});
