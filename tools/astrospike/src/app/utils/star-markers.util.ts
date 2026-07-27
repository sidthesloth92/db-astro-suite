import { StarMarkerParams } from '../models/star-marker-params.model';

/**
 * Draws the interaction markers for one overlay frame: a solid ring around the
 * hovered star and a dashed ring around every star the user has switched off.
 *
 * Only those two kinds of star are ever marked — ringing every detected star
 * would bury the image in noise. The context is left untouched otherwise: the
 * caller owns clearing the overlay, and the stroke style, line width, dash
 * pattern, and transform are all restored before returning. Nothing is drawn
 * when there is no hovered star and no disabled star.
 */
export function drawStarMarkers(ctx: CanvasRenderingContext2D, params: StarMarkerParams): void {
  const { hoveredStar, disabledStars } = params;
  if (hoveredStar === null && disabledStars.length === 0) {
    return;
  }
  ctx.save();
  try {
    ctx.lineWidth = params.lineWidthPx;

    if (disabledStars.length > 0) {
      ctx.strokeStyle = params.disabledColor;
      ctx.setLineDash([...params.disabledDashPx]);
      for (const star of disabledStars) {
        ctx.beginPath();
        ctx.arc(
          star.x * params.scale,
          star.y * params.scale,
          params.disabledRadiusPx,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }

    if (hoveredStar !== null) {
      ctx.strokeStyle = params.hoverColor;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(
        hoveredStar.x * params.scale,
        hoveredStar.y * params.scale,
        params.hoverRadiusPx,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}
