/**
 * Raised when compositing or encoding the exported image fails (missing 2D
 * context or a `toBlob` encode failure).
 */
export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}
