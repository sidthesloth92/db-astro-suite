/** Inputs to the "Edit profile" save rule. */
export interface ProfileSaveState {
  /** Display name as typed. */
  name: string;
  /** The profile's saved name when the dialog opened. */
  initialName: string;
  /** Cleaned handle as typed. */
  handle: string;
  /** The profile's current handle. */
  currentHandle: string;
  /** Server says a profile already lives at the typed handle (null = still checking). */
  handleExists: boolean | null;
  /** A request is in flight. */
  busy: boolean;
}
