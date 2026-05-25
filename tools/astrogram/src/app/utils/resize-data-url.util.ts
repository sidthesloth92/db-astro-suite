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
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(mime, quality);
}
