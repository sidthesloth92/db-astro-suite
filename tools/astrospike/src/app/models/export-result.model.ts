/**
 * Supported export outputs.
 *
 * `layer` is not an encoding but a composition: the spikes alone on
 * transparency, PNG-encoded, for dropping onto the original in an editor that
 * can composite it in Screen or Add. It is how the tool fits at the end of a
 * 16-bit pipeline without asking the user to give up their master.
 */
export type ExportFormat = 'png' | 'jpeg' | 'layer';

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
