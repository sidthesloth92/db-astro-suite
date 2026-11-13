import { SPIKE_ALPHA_FLOOR } from '../constants/spike-geometry.constants';
import { DEFAULT_HALO_PROFILE } from '../constants/spike-presets.constants';
import { HaloProfile, SpikePreset } from '../models/spike-preset.model';
import {
  computeHaloGeometry,
  computeSpikeGeometry,
  starHaloScale,
  starSpikeScale,
} from './spike-brightness.util';

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
    haloProfile: DEFAULT_HALO_PROFILE,
    ...overrides,
  };
}

describe('starSpikeScale', () => {
  const cases: ReadonlyArray<{ name: string; flux: number; fluxRef: number; expected: number }> = [
    { name: 'returns 1 for the reference flux itself', flux: 100, fluxRef: 100, expected: 1 },
    { name: 'clamps fluxes above the reference to 1', flux: 250, fluxRef: 100, expected: 1 },
    // 1 - 0.2 * log2(2) = 0.8: one octave below the reference.
    {
      name: 'loses SPIKE_MAGNITUDE_SLOPE per octave below the reference',
      flux: 50,
      fluxRef: 100,
      expected: 0.8,
    },
    // 1 - 0.2 * log2(10) = 0.3356.
    {
      name: 'keeps sinking with further octaves',
      flux: 10,
      fluxRef: 100,
      expected: 0.3356,
    },
    // 1 - 0.2 * log2(1000) would be negative: the floor keeps it visible.
    {
      name: 'clamps very faint stars to the visible scale floor',
      flux: 0.1,
      fluxRef: 100,
      expected: 0.15,
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
    // Regression guard: with too flat a slope every spiked star ends up
    // roughly the same size, which renders dense fields as an artificial
    // crosshatch. A star at a tenth of the reference flux must stay well
    // under half its spike length.
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
    // 100x below the reference bottoms out at the scale floor: s = 0.15.
    // lengthPx = 1000 * 0.06 * 1 * 0.15 * 0.5 = 4.5.
    expect(geometry.lengthPx).toBeCloseTo(4.5, 6);
    // ramp = 0.15 + 0.85 * 0.15 = 0.2775; alphaPeak = 0.55 * ramp.
    expect(geometry.alphaPeak).toBeCloseTo(0.55 * 0.2775, 4);
    // Thickness is clamped in image space (9 * 0.03 = 0.27 -> 1.5) and only
    // then scaled to the canvas, so the preview stays proportional to the
    // full-resolution export: 1.5 * 0.5 = 0.75.
    expect(geometry.thicknessPx).toBeCloseTo(0.75, 6);
    // glowRadiusPx = 0.75 * 2.5 = 1.875.
    expect(geometry.glowRadiusPx).toBeCloseTo(1.875, 6);
    expect(geometry.glowAlpha).toBeCloseTo(0.22 * 0.2775, 4);
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
    const preview = computeSpikeGeometry(100, 100, preset, 1, 1, imageMaxDimension, previewScale);

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

/** Builds a fully populated halo profile with selective overrides. */
function makeProfile(overrides: Partial<HaloProfile> = {}): HaloProfile {
  return {
    haloRadiusScale: 0.035,
    haloIntensity: 0.55,
    haloFalloffBeta: 1.5,
    coreRadiusRatio: 0.25,
    coreIntensity: 0.9,
    coreWhiteness: 0.75,
    fluxGamma: 0.5,
    ...overrides,
  };
}

describe('starHaloScale', () => {
  const cases: ReadonlyArray<{ name: string; flux: number; fluxRef: number; expected: number }> = [
    { name: 'returns 1 for the reference flux itself', flux: 100, fluxRef: 100, expected: 1 },
    { name: 'clamps fluxes above the reference to 1', flux: 250, fluxRef: 100, expected: 1 },
    // (25/100)^0.5 = 0.5.
    { name: 'follows the power law below the reference', flux: 25, fluxRef: 100, expected: 0.5 },
    // (1/100)^0.5 = 0.1.
    { name: 'keeps sinking with fainter flux', flux: 1, fluxRef: 100, expected: 0.1 },
    { name: 'returns 0 for zero flux', flux: 0, fluxRef: 100, expected: 0 },
    { name: 'returns 0 for negative flux', flux: -5, fluxRef: 100, expected: 0 },
    { name: 'guards a zero reference flux', flux: 50, fluxRef: 0, expected: 0 },
    { name: 'guards a negative reference flux', flux: 50, fluxRef: -1, expected: 0 },
  ];

  for (const c of cases) {
    it(`should scale flux: ${c.name}`, () => {
      expect(starHaloScale(c.flux, c.fluxRef, 0.5)).toBeCloseTo(c.expected, 4);
    });
  }

  it('should have no floor, unlike the spike scale', () => {
    // Regression guard against re-introducing starSpikeScale's floor: a star
    // ten thousand times fainter than the reference must sink to near zero,
    // not park at a visible minimum — the floor is what fogs Milky Way frames.
    expect(starHaloScale(0.01, 100, 0.5)).toBeCloseTo(0.01, 4);
    expect(starHaloScale(0.01, 100, 0.5)).toBeLessThan(0.15);
  });

  it('should grow monotonically with flux', () => {
    const faint = starHaloScale(1, 100, 0.5);
    const medium = starHaloScale(25, 100, 0.5);
    const brightest = starHaloScale(100, 100, 0.5);
    expect(faint).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(faint);
    expect(brightest).toBeGreaterThan(medium);
  });
});

describe('computeHaloGeometry', () => {
  it('should draw no halo at all at zero amount', () => {
    const halo = computeHaloGeometry(100, 100, makeProfile(), 0, 1, 2000, 1);
    expect(halo.haloRadiusPx).toBe(0);
    expect(halo.haloAlpha).toBe(0);
    expect(halo.coreRadiusPx).toBe(0);
    expect(halo.coreAlpha).toBe(0);
  });

  it('should compute the documented formulas for the reference star', () => {
    const halo = computeHaloGeometry(100, 100, makeProfile(), 1, 1, 2000, 1);
    // haloRadiusPx = 2000 * 0.035 * 1 * 1 * 1 = 70.
    expect(halo.haloRadiusPx).toBeCloseTo(70, 6);
    // haloAlpha = 0.55 * 1 * 1.
    expect(halo.haloAlpha).toBeCloseTo(0.55, 6);
    // coreRadiusPx = 70 * 0.25 = 17.5.
    expect(halo.coreRadiusPx).toBeCloseTo(17.5, 6);
    // coreAlpha = 0.9 * 1 * 1.
    expect(halo.coreAlpha).toBeCloseTo(0.9, 6);
  });

  it('should raise the halo alpha linearly and its radius faster', () => {
    const halo = (amount: number) => computeHaloGeometry(100, 100, makeProfile(), amount, 1, 2000, 1);
    const full = halo(1);

    expect(halo(0.5).haloAlpha).toBeCloseTo(full.haloAlpha * 0.5, 6);
    // Radius rises on HALO_RADIUS_AMOUNT_EXPONENT (a square root), so a low
    // setting still halos wide enough to notice instead of reading as a pinprick.
    expect(halo(0.25).haloRadiusPx).toBeCloseTo(full.haloRadiusPx * 0.5, 6);
    expect(halo(0.25).haloRadiusPx).toBeGreaterThan(full.haloRadiusPx * 0.25);
  });

  it('should zero out a faint star entirely below the visibility cutoff', () => {
    // The anti-fog regression guard: five magnitudes below the reference
    // (flux ratio 0.01, h = 0.1) at the seeded amount 0.6 lands at
    // 0.55 * 0.1 * 0.6 = 0.033 < HALO_MIN_VISIBLE_ALPHA, so the star draws
    // nothing at all rather than contributing to additive haze.
    const halo = computeHaloGeometry(1, 100, makeProfile(), 0.6, 1, 2000, 1);
    expect(halo.haloRadiusPx).toBe(0);
    expect(halo.haloAlpha).toBe(0);
    expect(halo.coreRadiusPx).toBe(0);
    expect(halo.coreAlpha).toBe(0);
  });

  it('should pin where the shipped profile stops drawing faint stars', () => {
    // The tuned DEFAULT_HALO_PROFILE at the seeded amount: a star 5 magnitudes
    // down (flux ratio 0.01) still draws — 0.9 * 0.1 * 0.6 = 0.054 clears the
    // cutoff — while 6.5 magnitudes down (ratio 0.0025, h = 0.05) does not,
    // which is the selectivity the profile's JSDoc promises.
    const visible = computeHaloGeometry(1, 100, DEFAULT_HALO_PROFILE, 0.6, 1, 2000, 1);
    expect(visible.haloAlpha).toBeGreaterThan(0);
    const gone = computeHaloGeometry(0.25, 100, DEFAULT_HALO_PROFILE, 0.6, 1, 2000, 1);
    expect(gone.haloRadiusPx).toBe(0);
    expect(gone.haloAlpha).toBe(0);
  });

  it('should keep a mid-brightness star visible above the cutoff', () => {
    // 2.5 magnitudes down (flux ratio 0.1, h ~ 0.316) must still bloom,
    // just visibly smaller than the reference star.
    const mid = computeHaloGeometry(10, 100, makeProfile(), 0.6, 1, 2000, 1);
    const bright = computeHaloGeometry(100, 100, makeProfile(), 0.6, 1, 2000, 1);
    expect(mid.haloAlpha).toBeGreaterThan(0);
    expect(mid.haloRadiusPx).toBeGreaterThan(0);
    expect(bright.haloRadiusPx).toBeGreaterThan(mid.haloRadiusPx);
    expect(bright.haloAlpha).toBeGreaterThan(mid.haloAlpha);
  });

  it('should size the core as a fixed fraction of the halo', () => {
    const halo = computeHaloGeometry(100, 100, makeProfile({ coreRadiusRatio: 0.3 }), 1, 1, 2000, 1);
    expect(halo.coreRadiusPx).toBeCloseTo(halo.haloRadiusPx * 0.3, 6);
  });

  it('should keep preview geometry proportional to the export geometry', () => {
    const imageMaxDimension = 6000;
    const previewScale = 2048 / imageMaxDimension;

    const exported = computeHaloGeometry(100, 100, makeProfile(), 0.6, 1, imageMaxDimension, 1);
    const preview = computeHaloGeometry(100, 100, makeProfile(), 0.6, 1, imageMaxDimension, previewScale);

    expect(preview.haloRadiusPx).toBeCloseTo(exported.haloRadiusPx * previewScale, 6);
    expect(preview.coreRadiusPx).toBeCloseTo(exported.coreRadiusPx * previewScale, 6);
    // Alpha is scale-independent — brightness must not change with zoom.
    expect(preview.haloAlpha).toBeCloseTo(exported.haloAlpha, 6);
    expect(preview.coreAlpha).toBeCloseTo(exported.coreAlpha, 6);
  });

  it('should clamp an out-of-range amount into [0, 1]', () => {
    const over = computeHaloGeometry(100, 100, makeProfile(), 1.5, 1, 2000, 1);
    const full = computeHaloGeometry(100, 100, makeProfile(), 1, 1, 2000, 1);
    expect(over.haloRadiusPx).toBeCloseTo(full.haloRadiusPx, 6);
    expect(over.haloAlpha).toBeCloseTo(full.haloAlpha, 6);

    const under = computeHaloGeometry(100, 100, makeProfile(), -0.5, 1, 2000, 1);
    expect(under.haloAlpha).toBe(0);
    expect(under.haloRadiusPx).toBe(0);
  });

  it('should scale both alphas with intensity while the radii stay put', () => {
    // Amount is reach, intensity is burn: turning intensity up must brighten
    // the halo without growing it.
    const base = computeHaloGeometry(100, 100, makeProfile(), 0.6, 1, 2000, 1);
    const hot = computeHaloGeometry(100, 100, makeProfile(), 0.6, 1.5, 2000, 1);
    expect(hot.haloAlpha).toBeCloseTo(base.haloAlpha * 1.5, 6);
    expect(hot.coreAlpha).toBeCloseTo(base.coreAlpha * 1.5, 6);
    expect(hot.haloRadiusPx).toBeCloseTo(base.haloRadiusPx, 6);
    expect(hot.coreRadiusPx).toBeCloseTo(base.coreRadiusPx, 6);
  });

  it('should clamp a blown-out intensity to full alpha', () => {
    // coreIntensity 0.9 * amount 1 * intensity 2 = 1.8 saturates at 1.
    const halo = computeHaloGeometry(100, 100, makeProfile(), 1, 2, 2000, 1);
    expect(halo.coreAlpha).toBe(1);
    expect(halo.haloAlpha).toBeCloseTo(1, 6);
  });

  it('should draw nothing at all at zero or negative intensity', () => {
    for (const intensity of [0, -1]) {
      const halo = computeHaloGeometry(100, 100, makeProfile(), 0.6, intensity, 2000, 1);
      expect(halo.haloRadiusPx).toBe(0);
      expect(halo.haloAlpha).toBe(0);
      expect(halo.coreRadiusPx).toBe(0);
      expect(halo.coreAlpha).toBe(0);
    }
  });

  it('should let a low intensity cut marginal stars out entirely', () => {
    // 2.5 magnitudes down glows at intensity 1 but its dimmed alpha
    // 0.55 * 0.316 * 0.6 * 0.3 ~ 0.031 falls under the visibility cutoff —
    // dimming the filter also thins out who glows, as a real one does.
    const lit = computeHaloGeometry(10, 100, makeProfile(), 0.6, 1, 2000, 1);
    const dimmed = computeHaloGeometry(10, 100, makeProfile(), 0.6, 0.3, 2000, 1);
    expect(lit.haloAlpha).toBeGreaterThan(0);
    expect(dimmed.haloAlpha).toBe(0);
    expect(dimmed.haloRadiusPx).toBe(0);
  });
});
