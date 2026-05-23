/**
 * Thrown when the Astrosolve backend rejects a request because the access key
 * is missing, invalid, or expired (HTTP 401). Surfaced to the UI so the user
 * can be prompted to re-enter their key.
 */
export class AccessKeyError extends Error {
  constructor() {
    super('Access key invalid or missing');
    this.name = 'AccessKeyError';
  }
}
