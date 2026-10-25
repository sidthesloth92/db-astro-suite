/** Viewport description shared by the WebGL and 2D sky renderers. */
export interface SkyViewport {
  /** CSS-pixel width. */
  width: number;
  /** CSS-pixel height. */
  height: number;
  /** Vertical field of view in degrees. */
  fovDeg: number;
}

/** Stereographic projection parameters derived from a viewport. */
export interface StereographicParams {
  /** Screen centre x (CSS px). */
  cx: number;
  /** Screen centre y (CSS px). */
  cy: number;
  /** Plane-to-pixel scale: pixels per unit of the stereographic plane. */
  scale: number;
}
