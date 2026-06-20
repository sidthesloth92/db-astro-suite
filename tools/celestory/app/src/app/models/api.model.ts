import type { CelestoryStory } from './story.model';

/** Standard API envelope: { code, message, details }. */
export interface ApiResponse<T> {
  code: string;
  message: string;
  details: T;
}

/** Result of ② Create — the public URL + a management session token (owner mode). */
export interface CreateStoryResult {
  handle: string;
  url: string;
  token: string;
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

/**
 * Authorization for a story mutation (update/delete): a logged-in owner's
 * management `token` (preferred) or the profile `password` (landing re-upload).
 */
export interface StoryAuth {
  token?: string;
  password?: string;
}

/**
 * Anonymous attempt ping sent on visualise. Carries only the dedup identity and
 * three headline integers — never a handle, never story contents.
 */
export interface AttemptPing {
  installId: string;
  dataFingerprint: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  objectCount: number;
}

/** A published (or sample) story fetched by handle; headline stats live in the
 * story's own summary block, so no separate stats payload is carried. */
export interface StoryDetails {
  handle: string;
  story: CelestoryStory;
  createdAt: string;
}
