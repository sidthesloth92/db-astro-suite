/**
 * Builds the OpenGraph / Twitter meta for a public profile page, focused on the
 * object or equipment named by the `?object=` / `?equipment=` query param when
 * present, else the whole-journey profile card. The focused `og:image` points at
 * the matching per-type OG endpoint so a shared deep-link unfurls as that card.
 */
import type { StoryDetails } from '../models/api.model';
import type { SocialMeta } from '../models/social-meta.model';
import { formatCount, formatHours } from './format.util';

/** Which object / equipment a profile link is focused on (from the URL query). */
export interface ProfileShareFocus {
  object: string | null;
  equipment: string | null;
}

/** Absolute `/user/<handle>` (+ optional query) URL, or undefined during SSR with no origin. */
function abs(origin: string | null, path: string): string | undefined {
  return origin ? `${origin}${path}` : undefined;
}

/** Build the focused (or default) social meta for a published profile. */
export function profileShareMeta(
  profile: StoryDetails,
  focus: ProfileShareFocus,
  origin: string | null,
): SocialMeta {
  const handle = encodeURIComponent(profile.handle);
  const story = profile.story;

  if (focus.object) {
    const o = story.objects.find((x) => x.id === focus.object);
    if (o) {
      const hours = formatHours(o.totalIntegrationSeconds);
      const name =
        o.designation && o.designation !== o.displayName
          ? `${o.designation} · ${o.displayName}`
          : o.displayName;
      const q = `?object=${encodeURIComponent(focus.object)}`;
      return {
        title: `Celestory — ${name} by @${profile.handle}`,
        description: `${hours}h integration · ${formatCount(o.lightFrameCount)} light frames · ${formatCount(o.nightCount)} nights.`,
        type: 'article',
        url: abs(origin, `/user/${handle}${q}`),
        image: abs(origin, `/api/og/user/${handle}${q}`),
      };
    }
  }

  if (focus.equipment) {
    const e = story.equipment.find((x) => x.id === focus.equipment);
    if (e) {
      const hours = formatHours(e.totalIntegrationSeconds);
      const q = `?equipment=${encodeURIComponent(focus.equipment)}`;
      return {
        title: `Celestory — ${e.displayName} by @${profile.handle}`,
        description: `${e.kind} · ${hours}h · ${formatCount(e.objectCount)} targets · ${formatCount(e.lightFrameCount)} light frames.`,
        type: 'article',
        url: abs(origin, `/user/${handle}${q}`),
        image: abs(origin, `/api/og/user/${handle}${q}`),
      };
    }
  }

  const summary = story.summary;
  const hours = formatHours(summary.totalIntegrationSeconds);
  return {
    title: `Celestory — @${profile.handle}'s journey · ${hours} h under the stars`,
    description: `${formatCount(summary.objectCount)} targets · ${hours}h integration · ${formatCount(summary.nightCount)} nights imaged.`,
    type: 'profile',
    url: abs(origin, `/user/${handle}`),
    image: abs(origin, `/api/og/user/${handle}`),
  };
}
