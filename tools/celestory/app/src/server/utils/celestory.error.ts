/**
 * Domain error classes for the Celestory server. Routes catch these and map
 * them to the standard { code, message, details } response shape with the
 * right HTTP status — no fragile string-matching on plain Error messages.
 */
import { MIN_PASSWORD_LENGTH } from './password';

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

/** The uploaded story failed strict schema validation. */
export class StoryValidationError extends CelestoryError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('STORY_INVALID', message, 422, details);
  }
}

/** The uploaded story is larger than the publish limit. */
export class PayloadTooLargeError extends CelestoryError {
  constructor(maxBytes: number) {
    super('STORY_TOO_LARGE', 'This story is too large to publish.', 413, { maxBytes });
  }
}

/** An anonymous attempt ping was missing its upload identity. */
export class PingIdentityError extends CelestoryError {
  constructor() {
    super(
      'PING_IDENTITY_MISSING',
      'An attempt ping requires both installId and dataFingerprint.',
      400,
    );
  }
}

/** An upload ping carried a malformed identity or out-of-range totals. */
export class PingInvalidError extends CelestoryError {
  constructor(message: string) {
    super('PING_INVALID', message, 422);
  }
}

/** Too many requests for this endpoint and subject within a rate-limit window. */
export class RateLimitedError extends CelestoryError {
  /** Seconds until the breached window resets (also sent as `Retry-After`). */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', 'Too many attempts. Please try again later.', 429, {
      retryAfterSeconds,
    });
    this.retryAfterSeconds = retryAfterSeconds;
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

/** The requested leaderboard board id is not one of the known boards. */
export class UnknownBoardError extends CelestoryError {
  constructor(id: string) {
    super('BOARD_UNKNOWN', `Unknown leaderboard board "${id}".`, 404, { id });
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

/** No valid owner session token was presented for a management action. */
export class SessionInvalidError extends CelestoryError {
  constructor() {
    super('SESSION_INVALID', 'Please log in to manage this profile.', 403);
  }
}

/** A password was required (create/update) but missing or too short. */
export class InvalidPasswordError extends CelestoryError {
  constructor(message = `A password of at least ${MIN_PASSWORD_LENGTH} characters is required.`) {
    super('PASSWORD_INVALID', message, 400);
  }
}

/** The supplied password did not match the stored one (update). */
export class BadPasswordError extends CelestoryError {
  constructor() {
    super('PASSWORD_INCORRECT', 'That password doesn’t match this profile.', 403);
  }
}

/** A profile display name was empty, too long, or used the reserved separator. */
export class NameInvalidError extends CelestoryError {
  constructor(message: string) {
    super('NAME_INVALID', message, 400);
  }
}

/** The supplied recovery code did not match this profile (or was already used). */
export class RecoveryCodeIncorrectError extends CelestoryError {
  constructor() {
    super('RECOVERY_CODE_INCORRECT', 'That recovery code doesn’t match this profile.', 403);
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
