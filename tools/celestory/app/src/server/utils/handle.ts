import { InvalidHandleError } from './celestory.error';
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  RESERVED_HANDLES,
} from './handle.constants';

/**
 * Validate a user-chosen handle, throwing InvalidHandleError on any breach.
 * Returns the normalized (trimmed, lowercased) handle on success.
 */
export function normalizeHandle(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InvalidHandleError('A handle is required.');
  }

  const handle = raw.trim().toLowerCase();

  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    throw new InvalidHandleError(
      `Handle must be ${HANDLE_MIN_LENGTH}–${HANDLE_MAX_LENGTH} characters.`,
    );
  }

  if (!HANDLE_PATTERN.test(handle)) {
    throw new InvalidHandleError(
      'Handle may use lowercase letters, numbers, and single hyphens only.',
    );
  }

  if (RESERVED_HANDLES.has(handle)) {
    throw new InvalidHandleError(`The handle "${handle}" is reserved.`);
  }

  return handle;
}
