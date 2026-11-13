/**
 * Raised when a star-lifting run is replaced by a newer one (the user changed the image).
 * Callers treat it as silent and expected.
 */
export class StarLiftSupersededError extends Error {
  constructor() {
    super('Star lifting was superseded by a newer request.');
    this.name = 'StarLiftSupersededError';
  }
}

/** Raised when star lifting fails, in the Web Worker or in the main-thread fallback. */
export class StarLiftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StarLiftError';
  }
}
