export class AccessKeyError extends Error {
  constructor() {
    super('Access key invalid or missing');
    this.name = 'AccessKeyError';
  }
}
