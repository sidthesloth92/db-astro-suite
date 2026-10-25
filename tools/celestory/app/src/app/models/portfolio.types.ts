import type { StoryDetails } from './api.model';

/** Async load state for the public portfolio page. */
export type PortfolioState =
  | { status: 'loading' }
  | { status: 'loaded'; profile: StoryDetails }
  /** No profile at this handle (HTTP 404). */
  | { status: 'not-found' }
  /** The server couldn't answer right now (database down, 5xx, offline). */
  | { status: 'unavailable' };
