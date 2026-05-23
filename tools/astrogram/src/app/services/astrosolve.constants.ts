import { UploadLimits } from './models/upload-limits.model';

/** localStorage key under which the Astrosolve access key is persisted. */
export const ACCESS_KEY_STORAGE_KEY = 'astrosolve_access_key';

/**
 * Fraction of the server's hard byte cap above which the UI warns the
 * user that the upload "will take a while" but still allows it. 80%
 * lines up with where solve queue cost meaningfully ticks up without
 * false-positively bothering most users.
 */
export const SOFT_SIZE_RATIO = 0.8;

/**
 * Used by `AstrosolveService.loadLimits()` when the `/api/v1/limits`
 * endpoint is unreachable on first load. Mirrors the server defaults so
 * client-side pre-validation behaves identically offline / during a
 * network blip rather than silently letting bad files through.
 */
export const FALLBACK_UPLOAD_LIMITS: UploadLimits = {
  maxBytes: 10 * 1024 * 1024,
  minDimension: 1000,
  maxDimension: 8000,
  allowedExtensions: ['.jpg', '.jpeg', '.png'],
};
