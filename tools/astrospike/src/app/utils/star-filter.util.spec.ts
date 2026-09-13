import { DetectionOptions, SourceMeasurement } from '../models/detection.types';
import { isValidSource } from './star-filter.util';

/** Threshold set shared by all table cases. */
const OPTS: DetectionOptions = {
  maxDimension: 1024,
  kSigma: 4,
  tileSize: 64,
  minArea: 5,
  maxArea: 200,
  maxAreaHard: 3200,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.5,
  minConcentration: 0.35,
  concentrationRadius: 8,
  extendedMinPeak: 100,
  maxStars: 500,
};

/** Builds a measurement that passes every threshold, then applies overrides. */
function measurement(overrides: Partial<SourceMeasurement> = {}): SourceMeasurement {
  return {
    cx: 10,
    cy: 10,
    flux: 100,
    peak: 20,
    area: 20,
    elongation: 1.1,
    concentration: 0.9,
    ...overrides,
  };
}

describe('star-filter.util', () => {
  describe('isValidSource', () => {
    const cases: ReadonlyArray<{
      name: string;
      m: SourceMeasurement;
      expected: boolean;
    }> = [
      {
        name: 'accepts a compact round source within every threshold',
        m: measurement(),
        expected: true,
      },
      {
        name: 'rejects a single-pixel hot pixel below minArea',
        m: measurement({ area: 1, peak: 10, flux: 100, elongation: 1 }),
        expected: false,
      },
      {
        name: 'accepts a source exactly at minArea',
        m: measurement({ area: 5 }),
        expected: true,
      },
      {
        name: 'rejects a diffuse extended blob (large, low concentration)',
        m: measurement({ area: 500, peak: 150, flux: 20000, concentration: 0.2 }),
        expected: false,
      },
      {
        name: 'accepts a source exactly at maxArea via the compact fast path',
        m: measurement({ area: 200, concentration: 0.1 }),
        expected: true,
      },
      {
        name: 'rejects a hot-pixel-like source with peak/flux above the ratio limit',
        m: measurement({ peak: 90, flux: 100 }),
        expected: false,
      },
      {
        name: 'accepts a peak/flux ratio exactly at the limit',
        m: measurement({ peak: 50, flux: 100 }),
        expected: true,
      },
      {
        name: 'rejects an elongated diffuse streak (satellite trail)',
        // Values measured from a synthetic 300px trail: enormous elongation
        // and almost no flux near the peak.
        m: measurement({ area: 330, peak: 199, flux: 34074, elongation: 89, concentration: 0.06 }),
        expected: false,
      },
      {
        name: 'accepts elongation exactly at the limit via the compact fast path',
        m: measurement({ elongation: 1.8, concentration: 0.1 }),
        expected: true,
      },
      {
        name: 'accepts a big saturated star through the concentration path',
        // Measured from a synthetic saturated star with its own arms:
        // area far beyond maxArea but flux packed around the peak.
        m: measurement({ area: 1689, peak: 247, flux: 138954, elongation: 1.32, concentration: 0.62 }),
        expected: true,
      },
      {
        name: 'accepts a star whose own asymmetric arms elongate its blob',
        // Elongation 2.81 — indistinguishable from a galaxy by shape alone;
        // concentration is what admits it.
        m: measurement({ area: 242, peak: 247, flux: 10116, elongation: 2.81, concentration: 0.7 }),
        expected: true,
      },
      {
        name: 'rejects an M82-like galaxy (elongated AND diffuse)',
        // Elongation 2.77 — nearly identical to the star-with-arms case
        // above; only the low concentration tells them apart.
        m: measurement({ area: 4713, peak: 167, flux: 219678, elongation: 2.77, concentration: 0.15 }),
        expected: false,
      },
      {
        name: 'rejects a faint elongated noise clump despite perfect concentration',
        // Tiny 3-px diagonal noise cluster: concentrated by definition, but far
        // too faint to be a star dragging arms — the extendedMinPeak gate.
        m: measurement({ area: 6, peak: 12, flux: 50, elongation: 2.4, concentration: 1 }),
        expected: false,
      },
      {
        name: 'accepts concentration exactly at the limit for a large source',
        m: measurement({ area: 500, peak: 150, flux: 20000, concentration: 0.35 }),
        expected: true,
      },
    ];

    for (const c of cases) {
      it(`should ${c.expected ? 'accept' : 'reject'}: ${c.name}`, () => {
        expect(isValidSource(c.m, OPTS)).toBe(c.expected);
      });
    }
  });
});
