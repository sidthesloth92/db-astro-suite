import { DetectedStar } from './detected-star.model';

/**
 * Everything the marker overlay renderer needs to draw one frame.
 *
 * Star coordinates arrive in full-resolution image pixels and are mapped to
 * canvas pixels through {@link StarMarkerParams.scale} plus the viewport
 * offsets; the radius and stroke width are already expressed in canvas pixels
 * and the color is a resolved CSS color string — so the renderer needs no DOM
 * or theme access.
 */
export interface StarMarkerParams {
  /** Star currently under the pointer, or null when nothing is hovered. */
  hoveredStar: DetectedStar | null;
  /**
   * Star the user last clicked, or null. Its ring persists after the click so
   * the current subject of any per-star action stays obvious.
   */
  selectedStar: DetectedStar | null;
  /** Scale from full-resolution image pixels to marker canvas pixels. */
  scale: number;
  /** Horizontal canvas-pixel offset added after scaling (viewport pan). */
  offsetX: number;
  /** Vertical canvas-pixel offset added after scaling (viewport pan). */
  offsetY: number;
  /** Radius of the hover ring in canvas pixels. */
  hoverRadiusPx: number;
  /** Radius of the persistent selection ring in canvas pixels. */
  selectedRadiusPx: number;
  /** Stroke width of the hover ring in canvas pixels. */
  lineWidthPx: number;
  /** Resolved CSS color for the hover ring. */
  hoverColor: string;
  /** Resolved CSS color for the selection ring. */
  selectedColor: string;
}
