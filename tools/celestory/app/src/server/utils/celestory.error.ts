/**
 * Domain error classes for the Celestory server. Routes catch these and map
 * them to the standard { code, message, details } response shape with the
 * right HTTP status — no fragile string-matching on plain Error messages.
 */

/** Base class so a single catch can detect any domain error. */
export class CelestoryError extends Error {
  /** Stable machine-readable code returned to the client. */
  readonly code: string;
  /** HTTP status the route should respond with. */
  readonly statusCode: number;
  /** Optional structured detail payload. */
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** The uploaded ledger failed strict schema validation. */
export class LedgerValidationError extends CelestoryError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('LEDGER_INVALID', message, 422, details);
  }
}

/** The requested handle is malformed or reserved. */
export class InvalidHandleError extends CelestoryError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('HANDLE_INVALID', message, 400, details);
  }
}

/** The requested handle is already taken. */
export class HandleTakenError extends CelestoryError {
  constructor(handle: string) {
    super('HANDLE_TAKEN', `The handle "${handle}" is already taken.`, 409, {
      handle,
    });
  }
}

/** No story exists for the given handle. */
export class StoryNotFoundError extends CelestoryError {
  constructor(handle: string) {
    super('STORY_NOT_FOUND', `No story found for "${handle}".`, 404, {
      handle,
    });
  }
}

/** The supplied delete key did not match. */
export class InvalidKeyError extends CelestoryError {
  constructor() {
    super('KEY_INVALID', 'That key is incorrect.', 403);
  }
}

/** The database connection string is missing at startup. */
export class DatabaseConfigError extends CelestoryError {
  constructor() {
    super(
      'DATABASE_NOT_CONFIGURED',
      'DATABASE_URL is not set. Add it to .env.local (local) or the Vercel project (deploy).',
      500,
    );
  }
}
