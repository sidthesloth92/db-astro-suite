import type { CelestoryStory } from './story.model';

/** Standard API envelope: { code, message, details }. */
export interface ApiResponse<T> {
  code: string;
  message: string;
  details: T;
}

/** Result of ② Create — the public URL, a management session token (owner mode) and the one-time recovery code. */
export interface CreateStoryResult {
  handle: string;
  url: string;
  token: string;
  /** Shown to the publisher once; the only way to reset a forgotten password. */
  recoveryCode: string;
}

/** Result of ③ Update — the public URL + a refreshed management session token. */
export interface UpdateStoryResult {
  handle: string;
  url: string;
  token: string;
}

/** Result of owner login — a management session token for the handle. */
export interface LoginResult {
  token: string;
}

/** Result of an owner rename — the saved name and the full observer line it produced. */
export interface UpdateNameResult {
  name: string;
  observer: string;
}

/** Result of a recovery-code password reset — an owner session token and the replacement recovery code. */
export interface RecoverResult {
  token: string;
  /** The new one-time code; the one just used no longer works. */
  recoveryCode: string;
}

/**
 * Authorization for a story mutation (update/delete): a logged-in owner's
 * management `token` (preferred) or the profile `password` (landing re-upload).
 */
export interface StoryAuth {
  token?: string;
  password?: string;
}

/**
 * Anonymous attempt ping sent on visualise. Carries only the upload identity
 * (installId + dataFingerprint) and three headline integers — never a handle,
 * never story contents.
 */
export interface AttemptPing {
  installId: string;
  dataFingerprint: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  targetCount: number;
}

/** A published (or sample) story fetched by handle; headline stats live in the
 * story's own summary block, so no separate stats payload is carried. */
export interface StoryDetails {
  handle: string;
  story: CelestoryStory;
  createdAt: string;
}
