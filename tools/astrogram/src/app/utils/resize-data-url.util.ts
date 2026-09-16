/**
 * Re-renders an already-captured image dataUrl into a canvas of exact
 * `width × height` pixels and re-encodes it as the given MIME type. Used
 * by the card exporter to guarantee the downloaded file matches the
 * preset dimensions even when raster sub-pixel rounding shifts the
 * source by 1 px. Background is filled black so any letterboxing from
 * minor aspect drift is visually consistent with the card chrome.
 */
export async function resizeDataUrlToExactDimensions(
  dataUrl: string,
  mime: 'image/jpeg' | 'image/png' | 'image/webp',
  width: number,
  height: number,
  quality = 0.95,
): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load captured image for resize'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // A capture of a fractionally sized card rounds up to one extra pixel row
  // or column that is almost all background. Scaling that down into the
  // target smeared it into a dark line along the bottom or right edge, so a
  // source up to 2px too large is cropped at 1:1 instead — which also keeps
  // the image free of resampling blur.
  const overshootW = img.naturalWidth - width;
  const overshootH = img.naturalHeight - height;
  if (overshootW >= 0 && overshootH >= 0 && overshootW <= 2 && overshootH <= 2) {
    ctx.drawImage(img, 0, 0, width, height, 0, 0, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas.toDataURL(mime, quality);
}
