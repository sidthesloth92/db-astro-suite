import { describe, expect, it } from 'vitest';
import { publishErrorMessage } from './publish-error.util';

describe('publishErrorMessage', () => {
  it('tells the user how long to wait when rate-limited', () => {
    expect(publishErrorMessage('RATE_LIMITED', { retryAfterSeconds: 30 })).toBe(
      'Too many attempts — try again in 1 minute.',
    );
    expect(publishErrorMessage('RATE_LIMITED', { retryAfterSeconds: 14 * 60 })).toBe(
      'Too many attempts — try again in 14 minutes.',
    );
    expect(publishErrorMessage('RATE_LIMITED', { retryAfterSeconds: 3 * 3600 })).toBe(
      'Too many attempts — try again in 3 hours.',
    );
  });

  it('falls back to a generic wait when the retry time is missing', () => {
    expect(publishErrorMessage('RATE_LIMITED')).toBe(
      'Too many attempts — please wait a while and try again.',
    );
    expect(publishErrorMessage('RATE_LIMITED', { retryAfterSeconds: 'soon' })).toBe(
      'Too many attempts — please wait a while and try again.',
    );
  });

  it('explains when a journey is too large to publish', () => {
    expect(publishErrorMessage('STORY_TOO_LARGE', { maxBytes: 3 * 1024 * 1024 })).toBe(
      'This journey is too large to publish (over 3 MB).',
    );
    expect(publishErrorMessage('STORY_TOO_LARGE')).toBe('This journey is too large to publish.');
  });

  it('states the current minimum password length', () => {
    expect(publishErrorMessage('PASSWORD_INVALID')).toBe(
      'Choose a password of at least 8 characters.',
    );
  });

  it('shows a generic message for unknown codes', () => {
    expect(publishErrorMessage('SOMETHING_NEW')).toBe('Something went wrong. Please try again.');
  });
});
