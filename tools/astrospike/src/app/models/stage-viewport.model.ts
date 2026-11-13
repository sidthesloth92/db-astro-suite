/**
 * The stage's zoom/pan state, expressed in full-resolution image space so it
 * is independent of the preview canvas size.
 */
export interface StageViewport {
  /** Magnification relative to the fitted preview; 1 = whole image visible. */
  zoom: number;
  /** Image-space x of the point at the centre of the view. */
  centerX: number;
  /** Image-space y of the point at the centre of the view. */
  centerY: number;
}

/** Top-left corner of the visible image region, in image space. */
export interface ViewportOrigin {
  /** Image-space x of the left edge of the view. */
  x: number;
  /** Image-space y of the top edge of the view. */
  y: number;
}
