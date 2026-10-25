import { MIN_PASSWORD_LENGTH } from '../models/password.constants';
import { MAX_DISPLAY_NAME_LENGTH, OBSERVER_PLACE_SEPARATOR } from '../models/observer.constants';

/** Human wait time for a rate-limit retry-after, e.g. "1 minute", "14 minutes", "3 hours". */
function waitLabel(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  if (minutes < 120) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  return `${Math.ceil(minutes / 60)} hours`;
}

/** Reads a positive finite number from an API error's details, or null when absent. */
function detailNumber(details: unknown, field: string): number | null {
  if (details === null || typeof details !== 'object') {
    return null;
  }
  const value = (details as Record<string, unknown>)[field];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Maps a Celestory API error code (and its details, for rate and size limits) to a
 * user-facing publish/update/delete/login message.
 */
export function publishErrorMessage(code: unknown, details?: unknown): string {
  switch (code) {
    case 'HANDLE_TAKEN':
      return 'That handle is taken — try another.';
    case 'HANDLE_INVALID':
      return 'Handles are 3–30 chars: lowercase letters, numbers and hyphens.';
    case 'PASSWORD_INVALID':
      return `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'PASSWORD_INCORRECT':
      return 'That password doesn’t match this profile.';
    case 'NAME_INVALID':
      return `Names are 1–${MAX_DISPLAY_NAME_LENGTH} characters, without “${OBSERVER_PLACE_SEPARATOR}”.`;
    case 'RECOVERY_CODE_INCORRECT':
      return 'That recovery code doesn’t match this profile.';
    case 'STORY_INVALID':
      return 'That file isn’t a valid celestory.json export.';
    case 'STORY_NOT_FOUND':
      return 'No profile found for that handle.';
    case 'SESSION_INVALID':
      return 'Your session expired — please log in again.';
    case 'STORY_TOO_LARGE': {
      const maxBytes = detailNumber(details, 'maxBytes');
      return maxBytes === null
        ? 'This journey is too large to publish.'
        : `This journey is too large to publish (over ${Math.round(maxBytes / (1024 * 1024))} MB).`;
    }
    case 'RATE_LIMITED': {
      const seconds = detailNumber(details, 'retryAfterSeconds');
      return seconds === null
        ? 'Too many attempts. Please wait a while and try again.'
        : `Too many attempts. Try again in ${waitLabel(seconds)}.`;
    }
    default:
      return 'Something went wrong. Please try again.';
  }
}
