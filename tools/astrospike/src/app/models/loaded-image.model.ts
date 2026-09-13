/**
 * Metadata about the image the user has loaded into the editor.
 */
export interface LoadedImage {
  /** Original file name as selected by the user. */
  fileName: string;
  /** Full-resolution image width in pixels. */
  width: number;
  /** Full-resolution image height in pixels. */
  height: number;
}

/**
 * A successfully decoded image: the drawable bitmap plus its metadata.
 */
export interface LoadedImageResult {
  /** Decoded full-resolution bitmap, ready to draw onto a canvas. */
  bitmap: ImageBitmap;
  /** Metadata describing the loaded image. */
  meta: LoadedImage;
}
