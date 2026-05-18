export class AstrosolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AstrosolveError';
  }
}
