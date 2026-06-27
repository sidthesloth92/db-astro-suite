/**
 * Schema.org JSON-LD builders. Each returns a plain object injected into the page
 * via `setStructuredData()`, keeping structured-data literals out of components.
 */
import type { StoryDetails } from '../models/api.model';

/** Shared site description used by the WebSite/Organization graph. */
const SITE_DESCRIPTION =
  'A privacy-first astrophotography journey — chart every target, every filter, every photon, rendered entirely in your browser.';

/** `WebSite` + `Organization` graph for the site root (landing page). */
export function websiteJsonLd(origin: string): object {
  const base = origin || undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Celestory',
        url: base,
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'Organization',
        name: 'Celestory',
        url: base,
        logo: origin ? `${origin}/icon-512.png` : undefined,
      },
    ],
  };
}

/** `ProfilePage` describing a public astrophotography journey, keyed on the handle. */
export function profileJsonLd(profile: StoryDetails, url: string | null): object {
  const summary = profile.story.summary;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: url || undefined,
    dateCreated: profile.createdAt || undefined,
    mainEntity: {
      '@type': 'Person',
      name: `@${profile.handle}`,
      alternateName: profile.handle,
      description: `${summary.objectCount} targets across ${summary.nightCount} nights under the stars.`,
    },
  };
}
