import { StageViewport, ViewportOrigin } from '../models/stage-viewport.model';

/**
 * Clamps a viewport so the zoom stays within [minZoom, maxZoom] and the
 * visible rectangle stays fully inside the image. At zoom 1 the centre is
 * forced to the image centre, so an un-zoomed view is always the whole image.
 *
 * The visible region is `imageWidth / zoom` by `imageHeight / zoom` because
 * the preview canvas shares the image's aspect ratio.
 */
export function clampViewport(
  viewport: StageViewport,
  imageWidth: number,
  imageHeight: number,
  minZoom: number,
  maxZoom: number,
): StageViewport {
  const zoom = Math.min(maxZoom, Math.max(minZoom, viewport.zoom));
  const halfW = imageWidth / (2 * zoom);
  const halfH = imageHeight / (2 * zoom);
  const centerX = Math.min(imageWidth - halfW, Math.max(halfW, viewport.centerX));
  const centerY = Math.min(imageHeight - halfH, Math.max(halfH, viewport.centerY));
  return { zoom, centerX, centerY };
}

/**
 * Zooms by `factor` while keeping the image point under the cursor
 * stationary on screen: the anchor's offset from the view centre shrinks by
 * the zoom ratio, so the same pixel stays put while everything else expands
 * around it. The result is clamped.
 */
export function zoomViewportAt(
  viewport: StageViewport,
  anchorX: number,
  anchorY: number,
  factor: number,
  imageWidth: number,
  imageHeight: number,
  minZoom: number,
  maxZoom: number,
): StageViewport {
  const zoom = Math.min(maxZoom, Math.max(minZoom, viewport.zoom * factor));
  const ratio = viewport.zoom / zoom;
  return clampViewport(
    {
      zoom,
      centerX: anchorX - (anchorX - viewport.centerX) * ratio,
      centerY: anchorY - (anchorY - viewport.centerY) * ratio,
    },
    imageWidth,
    imageHeight,
    minZoom,
    maxZoom,
  );
}

/**
 * Pans the viewport by an image-space delta (positive dx moves the view
 * right, i.e. the image appears to slide left) and clamps the result.
 */
export function panViewport(
  viewport: StageViewport,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
  minZoom: number,
  maxZoom: number,
): StageViewport {
  return clampViewport(
    { zoom: viewport.zoom, centerX: viewport.centerX + deltaX, centerY: viewport.centerY + deltaY },
    imageWidth,
    imageHeight,
    minZoom,
    maxZoom,
  );
}

/** Top-left corner of the visible image region, in image space. */
export function viewportOrigin(
  viewport: StageViewport,
  imageWidth: number,
  imageHeight: number,
): ViewportOrigin {
  return {
    x: viewport.centerX - imageWidth / (2 * viewport.zoom),
    y: viewport.centerY - imageHeight / (2 * viewport.zoom),
  };
}
