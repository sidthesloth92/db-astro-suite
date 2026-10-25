/**
 * Which name and username a journey shows, and who may edit them:
 * - Private Preview (the viewer's own unpublished file): the viewer's
 *   browser-saved name/username win; both are editable, saved in the browser.
 * - Published profile: always the profile's own saved name and its handle —
 *   never the viewer's — and only its logged-in owner may edit the name.
 * - Demo: the sample profile's own identity; not editable.
 */
import type { JourneyState } from '../models/journey.types';
import type { ViewerIdentity } from '../models/session.types';
import type { CelestoryStory } from '../models/story.model';
import { observerName } from './observer-name.util';
import { heroIdentity } from './portfolio.util';

/** A profile's own identity: its saved name (falls back to the handle) and its handle. */
export function profileIdentity(story: CelestoryStory, handle: string): ViewerIdentity {
  return { name: heroIdentity(story, handle).name, username: handle };
}

/** The identity a journey displays for this page type (see file docs). */
export function displayIdentity(
  state: JourneyState,
  story: CelestoryStory,
  handle: string,
  local: ViewerIdentity,
): ViewerIdentity {
  if (state === 'preview') {
    return {
      name: local.name || heroIdentity(story, handle).name,
      username: local.username || handle,
    };
  }
  return profileIdentity(story, handle);
}

/** Whether the display name can be edited here: in preview, or by the owner of a published profile. */
export function canEditDisplayName(state: JourneyState, isOwner: boolean): boolean {
  return state === 'preview' || (state === 'published' && isOwner);
}

/** Whether the username can be edited here: only in preview (a published username is its URL). */
export function canEditUsername(state: JourneyState): boolean {
  return state === 'preview';
}

/** The name a publish will carry: the viewer's edited name, else the file's own, else '' (none). */
export function publishName(story: CelestoryStory, local: ViewerIdentity): string {
  return local.name.trim() || observerName(story.observer);
}

/**
 * The identity a share card prints. In Private Preview (`persists`) it is the
 * viewer's saved identity, which the share dialogs edit in place. On a
 * published or demo profile it is the profile's own identity, overlaid with
 * any card-only edits made in the dialog — those are never saved, so they
 * can't leak onto other profiles.
 */
export function shareCardIdentity(
  persists: boolean,
  local: ViewerIdentity,
  story: CelestoryStory,
  handle: string,
  cardEdits: Partial<ViewerIdentity>,
): ViewerIdentity {
  return persists ? local : { ...profileIdentity(story, handle), ...cardEdits };
}
