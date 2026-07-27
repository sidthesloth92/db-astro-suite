import { DetectionOptions, SourceMeasurement } from '../models/detection.types';
import { isValidSource } from './star-filter.util';

/** Threshold set shared by all table cases. */
const OPTS: DetectionOptions = {
  maxDimension: 1024,
  kSigma: 4,
  tileSize: 64,
  minArea: 5,
  maxArea: 200,
  maxElongation: 1.8,
  maxPeakFluxRatio: 0.5,
  maxStars: 500,
};

/** Builds a measurement that passes every threshold, then applies overrides. */
function measurement(overrides: Partial<SourceMeasurement> = {}): SourceMeasurement {
  return { cx: 10, cy: 10, flux: 100, peak: 20, area: 20, elongation: 1.1, ...overrides };
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
        name: 'rejects an extended blob above maxArea',
        m: measurement({ area: 500 }),
        expected: false,
      },
      {
        name: 'accepts a source exactly at maxArea',
        m: measurement({ area: 200 }),
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
        name: 'rejects an elongated streak above maxElongation',
        m: measurement({ elongation: 3.5 }),
        expected: false,
      },
      {
        name: 'accepts elongation exactly at the limit',
        m: measurement({ elongation: 1.8 }),
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
