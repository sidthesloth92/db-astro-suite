import { DetectedStar } from './detected-star.model';

/**
 * Everything the marker overlay renderer needs to draw one frame.
 *
 * Star coordinates arrive in full-resolution image pixels and are mapped to
 * canvas pixels through {@link StarMarkerParams.scale}; every radius, width,
 * and dash length is already expressed in canvas pixels, and both colors are
 * resolved CSS color strings — so the renderer needs no DOM or theme access.
 */
export interface StarMarkerParams {
  /** Star currently under the pointer, or null when nothing is hovered. */
  hoveredStar: DetectedStar | null;
  /** Stars inside the visible cut the user has manually switched off. */
  disabledStars: readonly DetectedStar[];
  /** Scale from full-resolution image pixels to marker canvas pixels. */
  scale: number;
  /** Horizontal canvas-pixel offset added after scaling (viewport pan). */
  offsetX: number;
  /** Vertical canvas-pixel offset added after scaling (viewport pan). */
  offsetY: number;
  /** Radius of the hover ring in canvas pixels. */
  hoverRadiusPx: number;
  /** Radius of each disabled-star ring in canvas pixels. */
  disabledRadiusPx: number;
  /** Stroke width of both ring types in canvas pixels. */
  lineWidthPx: number;
  /** Dash pattern of the disabled-star ring in canvas pixels. */
  disabledDashPx: readonly number[];
  /** Resolved CSS color for the hover ring. */
  hoverColor: string;
  /** Resolved CSS color for the disabled-star rings. */
  disabledColor: string;
}
