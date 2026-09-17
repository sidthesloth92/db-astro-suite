import { Injectable } from '@angular/core';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/image-load.constants';
import { MAX_CANVAS_DIMENSION } from '../constants/render.constants';
import {
  ImageDecodeError,
  ImageTooLargeError,
  UnsupportedFormatError,
} from '../models/image-load.error';
import { LoadedImageResult } from '../models/loaded-image.model';

/**
 * @class ImageLoadService
 * @description
 * Validates and decodes a user-selected image file into an `ImageBitmap`
 * plus its metadata, mapping every failure mode to a typed, user-presentable
 * {@link ImageLoadError} subclass.
 *
 * @responsibilities
 * - Reject unsupported MIME types before touching the decoder
 * - Decode via `createImageBitmap`, mapping failures to {@link ImageDecodeError}
 * - Enforce the browser canvas dimension limit ({@link ImageTooLargeError})
 */
@Injectable({ providedIn: 'root' })
export class ImageLoadService {
  /**
   * Loads and decodes an image file.
   *
   * @param file The user-selected file.
   * @returns The decoded bitmap and its metadata.
   * @throws UnsupportedFormatError when the MIME type is not PNG/JPEG.
   * @throws ImageDecodeError when the browser cannot decode the data.
   * @throws ImageTooLargeError when a dimension exceeds the canvas limit.
   */
  async loadImageFile(file: File): Promise<LoadedImageResult> {
    if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
      throw new UnsupportedFormatError();
    }

    const bitmap = await this.decodeBitmap(file);

    if (bitmap.width > MAX_CANVAS_DIMENSION || bitmap.height > MAX_CANVAS_DIMENSION) {
      bitmap.close();
      throw new ImageTooLargeError();
    }

    return {
      bitmap,
      meta: { fileName: file.name, width: bitmap.width, height: bitmap.height },
    };
  }

  /**
   * Decodes the file into an `ImageBitmap`, mapping decode failures to
   * {@link ImageDecodeError}.
   *
   * TIFF hook: when TIFF support lands, a `file.type === 'image/tiff'` branch
   * here will `await import('../utils/tiff-decode.util')` and decode through
   * that lazily loaded module instead of `createImageBitmap`, keeping the
   * decoder out of the main bundle.
   */
  private async decodeBitmap(file: File): Promise<ImageBitmap> {
    try {
      return await createImageBitmap(file);
    } catch {
      // The decoder gives no actionable detail; converted to the typed,
      // user-presentable decode error (not swallowed).
      throw new ImageDecodeError();
    }
  }
}
