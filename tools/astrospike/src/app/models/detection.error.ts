/**
 * Rejection raised when a detection run is superseded by a newer request.
 * Callers treat this as a silent, expected outcome — the user simply started
 * a newer detection before the previous one finished.
 */
export class SupersededError extends Error {
  constructor() {
    super('Star detection was superseded by a newer request.');
    this.name = 'SupersededError';
  }
}

/**
 * Raised when the star detection pipeline fails — either inside the Web
 * Worker or during the main-thread fallback.
 */
export class StarDetectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StarDetectionError';
  }
}
