import { StarMarkerParams } from '../models/star-marker-params.model';

/**
 * Draws the interaction markers for one overlay frame: a ring around the star
 * under the pointer, and a persistent ring around the star the user last
 * clicked.
 *
 * Only those two stars are ever marked. Ringing every detected star would bury
 * the image in noise, while the selection ring is what keeps the subject of a
 * click obvious after the pointer has moved on — it is the anchor any future
 * per-star options would hang off.
 *
 * The context is left untouched otherwise: the caller owns clearing the
 * overlay, and the stroke style, line width, and transform are all restored
 * before returning. Nothing is drawn when there is neither a hovered nor a
 * selected star.
 */
export function drawStarMarkers(ctx: CanvasRenderingContext2D, params: StarMarkerParams): void {
  const { hoveredStar, selectedStar } = params;
  if (hoveredStar === null && selectedStar === null) {
    return;
  }
  ctx.save();
  try {
    ctx.lineWidth = params.lineWidthPx;
    ctx.setLineDash([]);

    if (selectedStar !== null) {
      ctx.strokeStyle = params.selectedColor;
      ctx.beginPath();
      ctx.arc(
        selectedStar.x * params.scale + params.offsetX,
        selectedStar.y * params.scale + params.offsetY,
        params.selectedRadiusPx,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    // Hover last so it reads on top when both land on the same star.
    if (hoveredStar !== null) {
      ctx.strokeStyle = params.hoverColor;
      ctx.beginPath();
      ctx.arc(
        hoveredStar.x * params.scale + params.offsetX,
        hoveredStar.y * params.scale + params.offsetY,
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
