import type { CardData, FilterExposure } from '../../models/card-data.model';
import { buildThemeViewData } from './theme-view-data.util';

/** A filter row that contributes to the palette (enabled, with frames). */
function filter(name: string, overrides: Partial<FilterExposure> = {}): FilterExposure {
  return { name, color: '#ffffff', frames: 10, seconds: 120, enabled: true, ...overrides };
}

/** Minimal card document — only the fields these derivations read. */
function card(filters: FilterExposure[], bortleScale = 5): CardData {
  return {
    title: 'NGC 2237 - Rosette Nebula',
    date: '2026-05-20',
    location: 'Irving, Texas',
    author: '@astrogram',
    filters,
    equipment: [],
    software: [],
    bortleScale,
    pixelSize: 3.76,
    focalLength: null,
    accentColor: '#ff2d95',
    secondaryAccentColor: '#00E5FF',
    cardOpacity: 0.8,
    backgroundImage: null,
    aspectRatio: '3:4',
    cardTheme: 'original',
  };
}

describe('buildThemeViewData palette derivation', () => {
  it('should read the classic narrowband trio as SHO however it was enabled', () => {
    // Enabled out of canonical order on purpose — the label must not follow
    // the order the user happened to toggle the switches in.
    const vm = buildThemeViewData(card([filter('OIII'), filter('Ha'), filter('SII')]));

    expect(vm.paletteLabel).toBe('SHO');
    expect(vm.bandKind).toBe('narrowband');
  });

  it('should read Ha plus OIII as HOO rather than HO', () => {
    expect(buildThemeViewData(card([filter('Ha'), filter('OIII')])).paletteLabel).toBe('HOO');
  });

  it('should read luminance plus RGB as LRGB and colour alone as RGB', () => {
    const lrgb = [filter('L'), filter('R'), filter('G'), filter('B')];
    expect(buildThemeViewData(card(lrgb)).paletteLabel).toBe('LRGB');
    expect(buildThemeViewData(card(lrgb.slice(1))).paletteLabel).toBe('RGB');
  });

  it('should call a broadband set broadband and a straddling set mixed', () => {
    expect(buildThemeViewData(card([filter('R'), filter('G')])).bandKind).toBe('broadband');
    expect(buildThemeViewData(card([filter('L'), filter('Ha')])).bandKind).toBe('mixed');
    expect(buildThemeViewData(card([filter('L'), filter('Ha')])).paletteLabel).toBe('LH');
  });

  it('should append a custom filter after the known letters and call it mixed', () => {
    const vm = buildThemeViewData(card([filter('Ha'), filter('Duo-band')]));

    expect(vm.paletteLabel).toBe('HD');
    expect(vm.bandKind).toBe('mixed');
  });

  it('should leave every palette field empty when no filter contributes', () => {
    const vm = buildThemeViewData(card([filter('Ha', { enabled: false }), filter('L', { frames: 0 })]));

    expect(vm.paletteLabel).toBe('');
    expect(vm.bandKind).toBe('');
    expect(vm.bandNames).toBe('');
  });

  it('should join the enabled band ids for the sub-label, mapping Ha to Hα', () => {
    expect(buildThemeViewData(card([filter('Ha'), filter('OIII')])).bandNames).toBe('Hα · OIII');
  });
});

describe('buildThemeViewData bortle descriptor', () => {
  it('should describe each end of the scale', () => {
    expect(buildThemeViewData(card([], 1)).bortleLabel).toBe('excellent dark-sky');
    expect(buildThemeViewData(card([], 9)).bortleLabel).toBe('inner city');
  });

  it('should clamp a value outside the 1-9 scale instead of rendering nothing', () => {
    expect(buildThemeViewData(card([], 0)).bortleLabel).toBe('excellent dark-sky');
    expect(buildThemeViewData(card([], 42)).bortleLabel).toBe('inner city');
  });
});
