import type { CelestoryLedger } from './ledger.model';

/** Standard API envelope: { code, message, details }. */
export interface ApiResponse<T> {
  code: string;
  message: string;
  details: T;
}

/** Result of ② Create — the public URL + one-time key. */
export interface CreateStoryResult {
  handle: string;
  url: string;
  key: string;
}

/** Result of ③ Update — the public URL (handle + delete key are unchanged). */
export interface UpdateStoryResult {
  handle: string;
  url: string;
}

/**
 * Anonymous attempt ping sent on visualise. Carries only the dedup identity and
 * three headline integers — never a handle, never ledger contents.
 */
export interface AttemptPing {
  installId: string;
  dataFingerprint: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  objectCount: number;
}

/** A published (or sample) story fetched by handle; headline stats live in the
 * ledger's own summary block, so no separate stats payload is carried. */
export interface StoryDetails {
  handle: string;
  ledger: CelestoryLedger;
  createdAt: string;
}
