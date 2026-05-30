/**
 * Domain error thrown by {@link AstrosolveService} when a plate-solve request
 * fails for any reason other than an access-key rejection (network failure,
 * 5xx response, malformed payload, etc.). Carries a human-readable message
 * suitable for display in the UI.
 */
export class AstrosolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AstrosolveError';
  }
}
