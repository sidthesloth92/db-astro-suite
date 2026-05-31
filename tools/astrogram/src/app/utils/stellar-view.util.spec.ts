import { ViewState } from '../models/stellar-view.model';
import { MAX_ZOOM, MIN_ZOOM } from '../components/stellar-map-preview/stellar-view.constants';
import {
  clampPan,
  clampZoom,
  IDENTITY_VIEW,
  panByScreenDelta,
  zoomAtPoint,
} from './stellar-view.util';

describe('stellar-view.util', () => {
  describe('clampZoom', () => {
    const cases: ReadonlyArray<{ name: string; input: number; expected: number }> = [
      { name: 'floors below the minimum', input: 0.2, expected: MIN_ZOOM },
      { name: 'caps above the maximum', input: 99, expected: MAX_ZOOM },
      { name: 'passes an in-range value through', input: 3, expected: 3 },
      { name: 'falls back to the minimum for NaN', input: NaN, expected: MIN_ZOOM },
    ];

    for (const c of cases) {
      it(`should clamp zoom: ${c.name}`, () => {
        expect(clampZoom(c.input)).toBe(c.expected);
      });
    }
  });

  describe('clampPan', () => {
    it('should force pan to zero at fit (zoom = 1)', () => {
      const view: ViewState = { zoom: 1, panXPct: -40, panYPct: 30 };
      expect(clampPan(view)).toEqual({ zoom: 1, panXPct: 0, panYPct: 0 });
    });

    it('should clamp pan to the covering range [100*(1-zoom), 0]', () => {
      const view: ViewState = { zoom: 4, panXPct: -500, panYPct: 50 };
      // min = 100 * (1 - 4) = -300; panX floored to -300, panY capped to 0.
      expect(clampPan(view)).toEqual({ zoom: 4, panXPct: -300, panYPct: 0 });
    });

    it('should leave an already-valid pan untouched', () => {
      const view: ViewState = { zoom: 2, panXPct: -50, panYPct: -10 };
      expect(clampPan(view)).toEqual(view);
    });
  });

  describe('zoomAtPoint', () => {
    it('should keep the anchored content point under the same screen spot', () => {
      // Anchor at the centre (u = v = 0.5). The content fraction under the
      // cursor must be invariant before and after the zoom.
      const before = IDENTITY_VIEW;
      const after = zoomAtPoint(before, 0.5, 0.5, 2);

      const fractionUnder = (view: ViewState, u: number): number =>
        // Inverse of screenX = (panFrac + frac * zoom): frac = (u - panFrac)/zoom.
        (u - view.panXPct / 100) / view.zoom;

      expect(fractionUnder(after, 0.5)).toBeCloseTo(fractionUnder(before, 0.5), 6);
      expect(after.zoom).toBe(2);
    });

    it('should clamp the resulting zoom and pan', () => {
      const after = zoomAtPoint(IDENTITY_VIEW, 0, 0, 999);
      expect(after.zoom).toBe(MAX_ZOOM);
      // Anchoring at the top-left corner keeps pan at 0.
      expect(after.panXPct).toBe(0);
      expect(after.panYPct).toBe(0);
    });

    it('should not pan when zoomed back to fit', () => {
      const zoomed = zoomAtPoint(IDENTITY_VIEW, 0.5, 0.5, 4);
      const reset = zoomAtPoint(zoomed, 0.5, 0.5, 1);
      expect(reset).toEqual(IDENTITY_VIEW);
    });
  });

  describe('panByScreenDelta', () => {
    it('should convert a screen delta to a percentage pan and clamp it', () => {
      const view: ViewState = { zoom: 2, panXPct: 0, panYPct: 0 };
      // dx = -100 px over a 400 px-wide (scaled) box at zoom 2:
      // ΔpanX% = 100 * -100 * 2 / 400 = -50; within [−100, 0] → kept.
      const after = panByScreenDelta(view, -100, 0, 400, 400);
      expect(after.panXPct).toBe(-50);
      expect(after.panYPct).toBe(0);
    });

    it('should not pan when the measured box has no size', () => {
      const view: ViewState = { zoom: 2, panXPct: -10, panYPct: -10 };
      expect(panByScreenDelta(view, -50, -50, 0, 0)).toBe(view);
    });
  });
});
