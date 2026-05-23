/**
 * Server-published upload constraints for the Astrosolve API.
 * Fetched once per session via `GET /api/v1/limits` and used to render the
 * upload hint and pre-validate files before they are uploaded.
 */
export interface UploadLimits {
  /** Maximum file size in bytes that the server will accept. */
  maxBytes: number;
  /** Minimum allowed image dimension (px) on either axis. */
  minDimension: number;
  /** Maximum allowed image dimension (px) on either axis. */
  maxDimension: number;
  /** Allowed file extensions (lowercase, dot-prefixed) — e.g. ".jpg". */
  allowedExtensions: string[];
}

/** Categorises a pre-upload validation failure for UI handling. */
export type ValidationFailureKind = 'size' | 'format' | 'dimension';

/**
 * Result of running the same checks the server runs, before the bytes
 * are sent. `softWarning` (when `ok` is true) indicates the file is
 * accepted but unusually large — UI may show a "this will take a while"
 * notice without blocking the upload.
 */
export type UploadValidation =
  | { ok: true; softWarning?: string }
  | { ok: false; kind: ValidationFailureKind; reason: string };
