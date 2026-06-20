/** Which web-storage area a value is persisted to. */
export type StorageKind = 'session' | 'local';

/** An authenticated owner session, scoped to one browser tab. */
export interface OwnerSession {
  /** The handle this session can manage (edit/delete). */
  handle: string;
  /** Signed management session token presented as a Bearer credential. */
  token: string;
}

/** The editable viewer identity, shared between the portfolio hero and Share Studio. */
export interface ViewerIdentity {
  /** Display name (e.g. "Vera C"). */
  name: string;
  /** Public handle without the leading "@" (e.g. "verac"). */
  handle: string;
}
