/** Maps a Celestory API error code to a user-facing publish/update/delete message. */
export function publishErrorMessage(code: unknown): string {
  switch (code) {
    case 'HANDLE_TAKEN':
      return 'That handle is taken — try another.';
    case 'HANDLE_INVALID':
      return 'Handles are 3–30 chars: lowercase letters, numbers and hyphens.';
    case 'PASSWORD_INVALID':
      return 'Choose a password of at least 6 characters.';
    case 'PASSWORD_INCORRECT':
      return 'That password doesn’t match this profile.';
    case 'LEDGER_INVALID':
      return 'That file isn’t a valid celestory.json export.';
    case 'STORY_NOT_FOUND':
      return 'No profile found for that handle.';
    case 'KEY_INVALID':
      return 'That delete token doesn’t match.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
