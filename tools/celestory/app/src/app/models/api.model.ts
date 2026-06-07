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

/** Denormalized headline stats returned with a story. */
export interface StoryStats {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string | null;
  latestSession: string | null;
}

/** A published story fetched by handle. */
export interface StoryDetails {
  handle: string;
  ledger: CelestoryLedger;
  stats: StoryStats;
  createdAt: string;
}
