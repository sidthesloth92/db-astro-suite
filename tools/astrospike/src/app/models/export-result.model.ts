/**
 * Supported image export encodings.
 */
export type ExportFormat = 'png' | 'jpeg';

/**
 * Result of encoding the composited image for download.
 */
export interface ExportResult {
  /** Encoded image data ready to be saved. */
  blob: Blob;
  /** Suggested download file name including extension. */
  filename: string;
  /** Size of the encoded blob in bytes. */
  sizeBytes: number;
}
