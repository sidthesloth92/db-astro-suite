export class AccessKeyError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'AccessKeyError';
  }
}
