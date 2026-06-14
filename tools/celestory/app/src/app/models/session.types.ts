/** A published profile recorded on this device. */
export interface PublishedSession {
  /** The claimed public handle. */
  handle: string;
  /** One-time delete token (server-minted capability key). */
  deleteToken: string;
}

/** The editable viewer identity, shared between the portfolio hero and Share Studio. */
export interface ViewerIdentity {
  /** Display name (e.g. "Vera C"). */
  name: string;
  /** Public handle without the leading "@" (e.g. "verac"). */
  handle: string;
}
