/**
 * Draws a photo onto a canvas no larger than `longSide` on its longer edge and returns the
 * pixels. The 3D scene analyses and textures this working copy, not the full-size photo.
 *
 * @param image - A fully loaded image
 * @param longSide - Longest allowed edge in px; smaller photos are not enlarged
 * @returns The working-size pixels, or null when the browser cannot provide a 2D canvas
 */
export function photoWorkingCopy(image: HTMLImageElement, longSide: number): ImageData | null {
  const scale = Math.min(1, longSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    return null;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}
