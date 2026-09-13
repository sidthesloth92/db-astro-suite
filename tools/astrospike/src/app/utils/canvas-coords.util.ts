import { CanvasPoint } from '../models/canvas-point.model';

/**
 * Maps a pointer event position to full-resolution image pixel coordinates.
 *
 * First converts the client position into canvas pixels by scaling through
 * the element's CSS bounding rect (`canvasX = (clientX - rect.left) *
 * canvasWidth / rect.width`), then divides by `previewScale` to undo the
 * preview downscale and land in full-resolution image pixels.
 */
export function pointerToImagePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  canvasWidth: number,
  canvasHeight: number,
  previewScale: number,
): CanvasPoint {
  const canvasX = ((clientX - rect.left) * canvasWidth) / rect.width;
  const canvasY = ((clientY - rect.top) * canvasHeight) / rect.height;
  return { x: canvasX / previewScale, y: canvasY / previewScale };
}
