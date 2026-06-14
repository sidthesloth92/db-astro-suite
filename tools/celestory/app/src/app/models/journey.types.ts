/**
 * The three states a journey visualization can be rendered in. The same
 * `dba-story-stats` visualization is shown in every state; only the banner and
 * the available actions differ.
 */
export type JourneyState = 'demo' | 'preview' | 'published';

/** A reference to an open object/equipment detail within the journey shell. */
export interface DetailRef {
  kind: 'object' | 'equipment';
  id: string;
}
