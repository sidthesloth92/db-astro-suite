/**
 * Image MIME types the loader accepts. TIFF support will be added later via a
 * lazily imported decoder (see `ImageLoadService`).
 */
export const SUPPORTED_IMAGE_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg'];
