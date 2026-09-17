/**
 * User-facing fallback message when image loading fails for a reason that
 * does not carry its own presentable message.
 */
export const IMAGE_LOAD_FAILED = 'The image could not be loaded. Please try a different file.';

/**
 * User-facing message when star detection fails on a loaded image.
 */
export const DETECTION_FAILED =
  'Star detection failed on this image. Please try again or use a different image.';

/**
 * User-facing message when exporting the composited image fails.
 */
export const EXPORT_FAILED = 'The export failed. Please try again.';

/**
 * User-facing guard message when an export is requested before an image is
 * loaded and star detection has finished.
 */
export const EXPORT_NOT_READY = 'Load an image and wait for star detection before exporting.';
