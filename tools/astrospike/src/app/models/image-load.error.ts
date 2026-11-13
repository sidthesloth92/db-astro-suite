/**
 * Base class for all errors raised while loading a user-supplied image.
 * Every subclass carries a user-presentable `message` that is safe to
 * render directly in the UI.
 */
export abstract class ImageLoadError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Raised when the selected file is not an image format the browser can decode.
 */
export class UnsupportedFormatError extends ImageLoadError {
  constructor() {
    super('This file type is not supported. Please choose a PNG or JPEG image — TIFF support is coming soon.');
  }
}

/**
 * Raised when the image exceeds the maximum dimensions the browser can
 * process on a canvas.
 */
export class ImageTooLargeError extends ImageLoadError {
  constructor() {
    super('This image is too large to process in the browser. Please resize it and try again.');
  }
}

/**
 * Raised when the browser fails to decode the image data.
 */
export class ImageDecodeError extends ImageLoadError {
  constructor() {
    super('The image could not be read. The file may be corrupted or incomplete.');
  }
}
