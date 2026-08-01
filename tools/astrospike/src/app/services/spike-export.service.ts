import { Injectable, OnDestroy } from '@angular/core';
import { ExportFormat, ExportResult } from '../models/export-result.model';
import { ExportError } from '../models/export.error';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { buildExportFilename } from '../utils/export-filename.util';
import { renderSpikes } from '../utils/spike-render.util';

/**
 * @class SpikeExportService
 * @description
 * Composites the full-resolution source image with the rendered diffraction
 * spikes, encodes it (PNG or JPEG), and triggers a browser download. The
 * `layer` output skips the source image entirely and encodes the spikes alone
 * on transparency.
 *
 * @responsibilities
 * - Render source bitmap + spikes at full resolution (scale 1), or spikes alone
 * - Encode via `canvas.toBlob` and build the download file name
 * - Manage the download object URL lifecycle: the URL is deliberately NOT
 *   revoked at download time — Chrome on Android resolves blob downloads
 *   asynchronously and an immediate revoke races (and kills) the download
 *   (crbug 827932). The previous export's URL is revoked on each new export
 *   and on service destroy.
 */
@Injectable({ providedIn: 'root' })
export class SpikeExportService implements OnDestroy {
  /**
   * Object URL of the most recent export's download, kept alive until the
   * next export (or destroy) so the in-flight download cannot be killed.
   */
  private previousObjectUrl: string | null = null;

  /**
   * Renders the composited image at full resolution, encodes it, and starts
   * a download.
   *
   * @param bitmap Full-resolution source image.
   * @param params Spike render parameters; rendered at scale 1 regardless of
   *   the preview scale carried in `params`.
   * @param format Output encoding, or `layer` for spikes alone on transparency.
   * @param quality JPEG encoder quality in (0, 1]; ignored for PNG.
   * @param sourceFileName Original file name used to build the download name.
   * @returns The encoded blob, file name, and size.
   * @throws ExportError when the canvas context or encoder fails.
   */
  async exportImage(
    bitmap: ImageBitmap,
    params: SpikeRenderParams,
    format: ExportFormat,
    quality: number,
    sourceFileName: string,
  ): Promise<ExportResult> {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new ExportError('Could not create a drawing context for export.');
    }

    // A layer leaves the canvas transparent and lets the additive spike pass
    // build up both colour and alpha, so the file carries the light to add and
    // the coverage to add it through. Anything else starts from the photo.
    if (format !== 'layer') {
      ctx.drawImage(bitmap, 0, 0);
    }
    const spriteCache: SpriteCache = new Map();
    renderSpikes(ctx, { ...params, scale: 1 }, spriteCache);

    const blob = await this.encodeCanvas(canvas, format, quality);
    const filename = buildExportFilename(sourceFileName, canvas.width, canvas.height, format);
    this.triggerDownload(blob, filename);

    return { blob, filename, sizeBytes: blob.size };
  }

  /** Revokes the retained download URL on teardown. */
  ngOnDestroy(): void {
    if (this.previousObjectUrl !== null) {
      URL.revokeObjectURL(this.previousObjectUrl);
      this.previousObjectUrl = null;
    }
  }

  /** Encodes the canvas via `toBlob`, mapping failure to {@link ExportError}. */
  private encodeCanvas(
    canvas: HTMLCanvasElement,
    format: ExportFormat,
    quality: number,
  ): Promise<Blob> {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob === null) {
            reject(new ExportError('The browser could not encode the exported image.'));
          } else {
            resolve(blob);
          }
        },
        mimeType,
        format === 'jpeg' ? quality : undefined,
      );
    });
  }

  /**
   * Downloads the blob via a DOM-attached anchor. Revokes the PREVIOUS
   * export's object URL and retains this one (see class doc / crbug 827932).
   */
  private triggerDownload(blob: Blob, filename: string): void {
    if (this.previousObjectUrl !== null) {
      URL.revokeObjectURL(this.previousObjectUrl);
    }
    const url = URL.createObjectURL(blob);
    this.previousObjectUrl = url;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
