import { MAX_DISPLAY_NAME_LENGTH, OBSERVER_PLACE_SEPARATOR } from '../models/observer.constants';
import type { ProfileSaveState } from '../models/profile-form.model';

/**
 * Problem with a typed display name, or ''. In "Edit profile" (`requireName`)
 * a saved name can't be cleared — the server needs 1–60 characters.
 */
export function displayNameError(name: string, requireName: boolean): string {
  const trimmed = name.trim();
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Names are at most ${MAX_DISPLAY_NAME_LENGTH} characters.`;
  }
  if (trimmed.includes(OBSERVER_PLACE_SEPARATOR)) {
    return `Names can’t contain “${OBSERVER_PLACE_SEPARATOR}”.`;
  }
  if (requireName && !trimmed) {
    return 'Enter a display name.';
  }
  return '';
}

/**
 * Whether "Edit profile" can save: something changed, the name is valid, and a
 * changed handle has been confirmed free by the server (not taken, not still
 * checking).
 */
export function canSaveProfile(state: ProfileSaveState): boolean {
  const name = state.name.trim();
  const nameChanged = !!name && name !== state.initialName;
  const handleChanged = state.handle !== state.currentHandle;
  const nameOk = !displayNameError(state.name, !!state.initialName);
  const handleOk = !handleChanged || state.handleExists === false;
  return !state.busy && !!state.handle && nameOk && handleOk && (nameChanged || handleChanged);
}
