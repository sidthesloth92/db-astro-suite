/** Decoded payload carried inside an owner management session token. */
export interface SessionPayload {
  /** The profile handle this token authorizes management (edit/delete) for. */
  handle: string;
  /** The specific story row id — binds the token to one profile instance so a
   * deleted-then-reclaimed handle cannot be managed with a stale token. */
  sid: string;
  /** Expiry as a Unix epoch timestamp in milliseconds. */
  exp: number;
}
