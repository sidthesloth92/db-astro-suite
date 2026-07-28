import { StarMarkerParams } from '../models/star-marker-params.model';

/**
 * Draws the interaction marker for one overlay frame: a ring around the star
 * under the pointer, so the user can see what a click would act on.
 *
 * Only the hovered star is ever marked. Ringing every detected star would bury
 * the image in noise, and a star the user switched off needs no badge — the
 * spikes disappearing is the feedback, and clicking again brings them back.
 *
 * The context is left untouched otherwise: the caller owns clearing the
 * overlay, and the stroke style, line width, and transform are all restored
 * before returning. Nothing is drawn when no star is hovered.
 */
export function drawStarMarkers(ctx: CanvasRenderingContext2D, params: StarMarkerParams): void {
  const { hoveredStar } = params;
  if (hoveredStar === null) {
    return;
  }
  ctx.save();
  try {
    ctx.lineWidth = params.lineWidthPx;
    ctx.strokeStyle = params.hoverColor;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(
      hoveredStar.x * params.scale + params.offsetX,
      hoveredStar.y * params.scale + params.offsetY,
      params.hoverRadiusPx,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}
