import { SPIKE_ALPHA_FLOOR } from '../constants/spike-geometry.constants';
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
    // pow(0.5, 0.6) = 0.659754...
    {
      name: 'follows pow(flux/fluxRef, 0.6) below the reference',
      flux: 50,
      fluxRef: 100,
      expected: 0.6598,
    },
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

  it('should separate faint stars from bright ones strongly enough to avoid uniform spikes', () => {
    // Regression guard: with a flat exponent every spiked star ends up roughly
    // the same size, which renders dense fields as an artificial crosshatch.
    // A star at a tenth of the reference flux must stay well under half its
    // spike length.
    expect(starSpikeScale(10, 100)).toBeLessThan(0.45);
    // ...while still being visible rather than collapsing to nothing.
    expect(starSpikeScale(10, 100)).toBeGreaterThan(0.1);
  });
});

describe('computeSpikeGeometry', () => {
  it('should compute the documented formulas for the brightest star', () => {
    const geometry = computeSpikeGeometry(100, 100, makePreset(), 1, 1, 2000, 1);
    // lengthPx = 2000 * 0.12 * 1 * 1 * 1 = 240.
    expect(geometry.lengthPx).toBeCloseTo(240, 6);
    // s = 1, so the alpha ramp reaches its full value: 0.8 * 1 = 0.8.
    expect(geometry.alphaPeak).toBeCloseTo(0.8, 6);
    // thicknessPx = 240 * 0.035 = 8.4, inside the [1.5, 16] clamp.
    expect(geometry.thicknessPx).toBeCloseTo(8.4, 6);
    // glowRadiusPx = 8.4 * 3 = 25.2.
    expect(geometry.glowRadiusPx).toBeCloseTo(25.2, 6);
    // glowAlpha = 0.35 * 1 * 1 = 0.35.
    expect(geometry.glowAlpha).toBeCloseTo(0.35, 6);
  });

  it('should scale down a faint star and clamp thickness to the floor', () => {
    const preset = makePreset({
      lengthScale: 0.06,
      intensityScale: 0.55,
      thicknessRatio: 0.03,
      glowRadiusRatio: 2.5,
      glowIntensity: 0.22,
    });
    const geometry = computeSpikeGeometry(1, 100, preset, 1, 1, 1000, 0.5);
    // s = pow(0.01, 0.6) = 0.0630957.
    // lengthPx = 1000 * 0.06 * 1 * 0.0630957 * 0.5 = 1.89287.
    expect(geometry.lengthPx).toBeCloseTo(1.89287, 4);
    // ramp = 0.15 + 0.85 * 0.0630957 = 0.203631; alphaPeak = 0.55 * ramp.
    expect(geometry.alphaPeak).toBeCloseTo(0.55 * 0.203631, 4);
    // Thickness is clamped in image space (3.7857 * 0.03 = 0.1136 -> 1.5) and
    // only then scaled to the canvas, so the preview stays proportional to the
    // full-resolution export: 1.5 * 0.5 = 0.75.
    expect(geometry.thicknessPx).toBeCloseTo(0.75, 6);
    // glowRadiusPx = 0.75 * 2.5 = 1.875.
    expect(geometry.glowRadiusPx).toBeCloseTo(1.875, 6);
    expect(geometry.glowAlpha).toBeCloseTo(0.22 * 0.203631, 4);
  });

  it('should clamp thickness to the ceiling and alphas to 1', () => {
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

  it('should keep preview geometry proportional to the export geometry', () => {
    // What the user tunes on the downscaled preview is what the full-resolution
    // export must produce. Clamping thickness after applying the scale would
    // let the bounds bite at different points in each, so the two are compared
    // here at a scale where the export hits the thickness ceiling.
    const preset = makePreset();
    const imageMaxDimension = 6000;
    const previewScale = 2048 / imageMaxDimension;

    const exported = computeSpikeGeometry(100, 100, preset, 1, 1, imageMaxDimension, 1);
    const preview = computeSpikeGeometry(
      100,
      100,
      preset,
      1,
      1,
      imageMaxDimension,
      previewScale,
    );

    expect(exported.thicknessPx).toBe(16); // ceiling reached at full resolution
    expect(preview.lengthPx).toBeCloseTo(exported.lengthPx * previewScale, 6);
    expect(preview.thicknessPx).toBeCloseTo(exported.thicknessPx * previewScale, 6);
    expect(preview.glowRadiusPx).toBeCloseTo(exported.glowRadiusPx * previewScale, 6);
    // Alpha is scale-independent — brightness must not change with zoom.
    expect(preview.alphaPeak).toBeCloseTo(exported.alphaPeak, 6);
    expect(preview.glowAlpha).toBeCloseTo(exported.glowAlpha, 6);
  });

  it('should keep the floor alpha for a zero-flux star while its length collapses', () => {
    const geometry = computeSpikeGeometry(0, 100, makePreset(), 1, 1, 2000, 1);
    // s = 0: no arm length, but alpha keeps the configured floor term.
    expect(geometry.lengthPx).toBe(0);
    expect(geometry.thicknessPx).toBe(1.5);
    expect(geometry.alphaPeak).toBeCloseTo(0.8 * SPIKE_ALPHA_FLOOR, 6);
    expect(geometry.glowAlpha).toBeCloseTo(0.35 * SPIKE_ALPHA_FLOOR, 6);
  });
});
