/**
 * A point in full-resolution image pixel coordinates, produced by mapping a
 * pointer event through the preview canvas transform.
 */
export interface CanvasPoint {
  /** X coordinate in full-resolution image pixels. */
  x: number;
  /** Y coordinate in full-resolution image pixels. */
  y: number;
}
