import type { StoryDetails } from './api.model';

/** Async load state for the public portfolio page. */
export type PortfolioState =
  | { status: 'loading' }
  | { status: 'loaded'; story: StoryDetails }
  | { status: 'error' };
