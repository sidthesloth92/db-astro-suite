import type { CelestoryStory } from './story.model';
import sampleStory from './sample-celestory.json';

/**
 * A rich, decade-long sample story powering the "Explore Sample Journey" button
 * and the /demo showcase. Authored as JSON (the single source of truth, also
 * published to /public for download) to the CelestoryStory contract; the
 * structural JSON import is assignable to the domain type with no cast.
 */
export const SAMPLE_STORY: CelestoryStory = sampleStory;

/** The handle the bundled demo journey ("Vera") renders under in the hero on /demo. */
export const SAMPLE_HANDLE = 'vera';
