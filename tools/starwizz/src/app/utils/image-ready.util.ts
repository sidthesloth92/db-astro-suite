/**
 * True once an image has finished loading and has pixels to draw. An image with no source, or
 * one that failed, also reports `complete`, so the width is what tells them apart.
 *
 * @param image - The image to check
 */
export function isImageReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}
