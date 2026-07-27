import { SpikePreset } from '../models/spike-preset.model';
import { computeSpikeGeometry, starSpikeScale } from './spike-brightness.util';

/** Builds a fully populated test preset with selective overrides. */
function makePreset(overrides: Partial<SpikePreset> = {}): SpikePreset {
  return {
    id: 'classic',
    label: 'Test',
    description: 'Test preset',
    spikeCount: 4,
    lengthScale: 0.12,
    intensityScale: 0.8,
    thicknessRatio: 0.035,
    falloffGamma: 2.2,
    glowRadiusRatio: 3,
    glowIntensity: 0.35,
    rotationOffsetDeg: 45,
    ...overrides,
  };
}

describe('starSpikeScale', () => {
  const cases: ReadonlyArray<{ name: string; flux: number; fluxRef: number; expected: number }> = [
    { name: 'returns 1 for the reference flux itself', flux: 100, fluxRef: 100, expected: 1 },
    { name: 'clamps fluxes above the reference to 1', flux: 250, fluxRef: 100, expected: 1 },
    // pow(0.5, 0.35) = 0.784584...
    { name: 'follows pow(flux/fluxRef, 0.35) below the reference', flux: 50, fluxRef: 100, expected: 0.7846 },
    { name: 'returns 0 for zero flux', flux: 0, fluxRef: 100, expected: 0 },
    { name: 'returns 0 for negative flux', flux: -5, fluxRef: 100, expected: 0 },
    { name: 'guards a zero reference flux', flux: 50, fluxRef: 0, expected: 0 },
    { name: 'guards a negative reference flux', flux: 50, fluxRef: -1, expected: 0 },
  ];

  for (const c of cases) {
    it(`should scale flux: ${c.name}`, () => {
      expect(starSpikeScale(c.flux, c.fluxRef)).toBeCloseTo(c.expected, 4);
    });
  }

  it('should grow monotonically with flux', () => {
    const faint = starSpikeScale(10, 100);
    const medium = starSpikeScale(50, 100);
    const brightest = starSpikeScale(100, 100);
    expect(faint).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(faint);
    expect(brightest).toBeGreaterThan(medium);
  });
});

describe('computeSpikeGeometry', () => {
  it('should compute the documented formulas for the brightest star', () => {
    const geometry = computeSpikeGeometry(100, 100, makePreset(), 1, 1, 2000, 1);
    // lengthPx = 2000 * 0.12 * 1 * 1 * 1 = 240.
    expect(geometry.lengthPx).toBeCloseTo(240, 6);
    // alphaPeak = 0.8 * 1 * (0.35 + 0.65 * 1) = 0.8.
    expect(geometry.alphaPeak).toBeCloseTo(0.8, 6);
    // thicknessPx = 240 * 0.035 = 8.4, inside the [1.5, 16] clamp.
    expect(geometry.thicknessPx).toBeCloseTo(8.4, 6);
    // glowRadiusPx = 8.4 * 3 = 25.2.
    expect(geometry.glowRadiusPx).toBeCloseTo(25.2, 6);
    // glowAlpha = 0.35 * 1 * 1 = 0.35.
    expect(geometry.glowAlpha).toBeCloseTo(0.35, 6);
  });

  it('should scale down a faint star and clamp thickness to the 1.5 px floor', () => {
    const preset = makePreset({
      lengthScale: 0.06,
      intensityScale: 0.55,
      thicknessRatio: 0.03,
      glowRadiusRatio: 2.5,
      glowIntensity: 0.22,
    });
    const geometry = computeSpikeGeometry(1, 100, preset, 1, 1, 1000, 0.5);
    // s = pow(0.01, 0.35) = 0.199526.
    // lengthPx = 1000 * 0.06 * 1 * 0.199526 * 0.5 = 5.9858.
    expect(geometry.lengthPx).toBeCloseTo(5.9858, 3);
    // alphaPeak = 0.55 * (0.35 + 0.65 * 0.199526) = 0.26383.
    expect(geometry.alphaPeak).toBeCloseTo(0.26383, 4);
    // Raw thickness 5.9858 * 0.03 = 0.1796 clamps up to 1.5.
    expect(geometry.thicknessPx).toBe(1.5);
    // glowRadiusPx = 1.5 * 2.5 = 3.75.
    expect(geometry.glowRadiusPx).toBeCloseTo(3.75, 6);
    // glowAlpha = 0.22 * (0.35 + 0.65 * 0.199526) = 0.10553.
    expect(geometry.glowAlpha).toBeCloseTo(0.10553, 4);
  });

  it('should clamp thickness to the 16 px ceiling and alphas to 1', () => {
    const preset = makePreset({
      lengthScale: 0.16,
      intensityScale: 0.9,
      thicknessRatio: 0.035,
      glowIntensity: 0.4,
    });
    const geometry = computeSpikeGeometry(100, 100, preset, 2, 2, 16000, 1);
    // lengthPx = 16000 * 0.16 * 2 = 5120; raw thickness 179.2 clamps to 16.
    expect(geometry.lengthPx).toBeCloseTo(5120, 6);
    expect(geometry.thicknessPx).toBe(16);
    expect(geometry.glowRadiusPx).toBeCloseTo(48, 6);
    // alphaPeak raw = 0.9 * 2 * 1 = 1.8 clamps to 1.
    expect(geometry.alphaPeak).toBe(1);
    // glowAlpha raw = 0.4 * 2 * 1 = 0.8 stays unclamped.
    expect(geometry.glowAlpha).toBeCloseTo(0.8, 6);
  });

  it('should keep a floor alpha for a zero-flux star while its length collapses', () => {
    const geometry = computeSpikeGeometry(0, 100, makePreset(), 1, 1, 2000, 1);
    // s = 0: no arm length, but alpha keeps the 0.35 base term.
    expect(geometry.lengthPx).toBe(0);
    expect(geometry.thicknessPx).toBe(1.5);
    expect(geometry.alphaPeak).toBeCloseTo(0.8 * 0.35, 6);
    expect(geometry.glowAlpha).toBeCloseTo(0.35 * 0.35, 6);
  });
});
