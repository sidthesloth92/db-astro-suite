import { ViewState } from '../models/stellar-view.model';
import { MAX_ZOOM, MIN_ZOOM } from '../components/stellar-map-preview/stellar-view.constants';

/** Identity view — fit-to-card, no pan. */
export const IDENTITY_VIEW: ViewState = { zoom: 1, panXPct: 0, panYPct: 0 };

/** Clamps a raw zoom value into the supported `[MIN_ZOOM, MAX_ZOOM]` range. */
export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Clamps pan so the (scaled) layer always covers the card — no empty gap can
 * appear at any edge. Valid pan range per axis is `[100 * (1 - zoom), 0]`,
 * which collapses to exactly `0` at `zoom === 1`.
 */
export function clampPan(view: ViewState): ViewState {
  const min = 100 * (1 - view.zoom);
  const clamp = (v: number): number => Math.min(0, Math.max(min, v));
  return { ...view, panXPct: clamp(view.panXPct), panYPct: clamp(view.panYPct) };
}

/**
 * Zooms to `nextZoom` while keeping the content fraction `(u, v)` (each in
 * `[0, 1]`, measured from the layer's top-left) anchored under the same screen
 * point. Derived from `screenX = O + (panFrac + u * zoom) * W0`: holding
 * `screenX` fixed gives `panPct' = panPct + 100 * u * (zoom - nextZoom)`.
 */
export function zoomAtPoint(
  view: ViewState,
  u: number,
  v: number,
  nextZoom: number,
): ViewState {
  const z = clampZoom(nextZoom);
  return clampPan({
    zoom: z,
    panXPct: view.panXPct + 100 * u * (view.zoom - z),
    panYPct: view.panYPct + 100 * v * (view.zoom - z),
  });
}

/**
 * Pans by a screen-pixel delta. A screen delta `d` moves the content by
 * `100 * d * zoom / rectSize` percent of the layer box (since
 * `rectSize = W0 * zoom`), keeping the grabbed point under the pointer.
 */
export function panByScreenDelta(
  view: ViewState,
  dxPx: number,
  dyPx: number,
  rectWidth: number,
  rectHeight: number,
): ViewState {
  if (rectWidth <= 0 || rectHeight <= 0) return view;
  return clampPan({
    ...view,
    panXPct: view.panXPct + (100 * dxPx * view.zoom) / rectWidth,
    panYPct: view.panYPct + (100 * dyPx * view.zoom) / rectHeight,
  });
}
