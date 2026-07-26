/**
 * Maps a parsed Story (the `story_json` of a published profile) into the OG card
 * models for the profile, a single target, or a single piece of equipment. Pure;
 * the target/equipment mappers return null when the id is not found so the route
 * can fall back to the profile/brand card.
 */
import type { EquipmentItem, Story } from '../utils/story.types';
import type { OgEquipmentModel, OgProfileModel, OgTargetModel } from './og-card.model';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Rounded integration hours as a bare number string, e.g. "562" (the card adds "h"). */
function hoursNum(seconds: number): string {
  return Math.round((seconds || 0) / 3600).toLocaleString('en-US');
}

/** Thousands-separated integer label. */
function countLabel(n: number): string {
  return Number(n || 0).toLocaleString('en-US');
}

/** Single-night duration label, e.g. "11h 42m". */
function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Parse an ISO date, or null when blank/invalid. */
function parseIso(iso: string): Date | null {
  if (!iso) {
    return null;
  }
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t);
}

/** "Nov 2023" from an ISO date, or "—". */
function monthYear(iso: string): string {
  const d = parseIso(iso);
  return d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '—';
}

/** Four-digit year from an ISO date, or "". */
function yearOf(iso: string): string {
  const d = parseIso(iso);
  return d ? String(d.getUTCFullYear()) : '';
}

/** The target a gear was used on most (by summed session integration), or a fallback. */
function mostUsedOn(story: Story, gear: EquipmentItem): string {
  let bestName = '';
  let bestSeconds = 0;
  for (const o of story.targets ?? []) {
    let seconds = 0;
    for (const sess of o.sessions ?? []) {
      if ((sess.equipmentIds ?? []).includes(gear.id)) {
        seconds += sess.integrationSeconds || 0;
      }
    }
    if (seconds > bestSeconds) {
      bestSeconds = seconds;
      bestName = o.designation || o.displayName;
    }
  }
  if (!bestName) {
    const first = story.targets?.find((x) => x.id === (gear.targetIds ?? [])[0]);
    bestName = first ? first.designation || first.displayName : '';
  }
  return bestName || '—';
}

/** Map a story to the per-profile OG card model (headline stats + highlights). */
export function toProfileOgModel(story: Story, handle: string): OgProfileModel {
  const s = story.summary;
  const targets = story.targets ?? [];
  const topTarget = [...targets].sort(
    (a, b) => (b.totalIntegrationSeconds || 0) - (a.totalIntegrationSeconds || 0),
  )[0];
  const mostImaged = [...targets].sort((a, b) => (b.lightFrameCount || 0) - (a.lightFrameCount || 0))[0];
  const longestNight = (s.activity ?? []).reduce((m, a) => Math.max(m, a.integrationSeconds || 0), 0);
  return {
    handle,
    hours: hoursNum(s.totalIntegrationSeconds),
    targets: countLabel(s.targetCount),
    nights: countLabel(s.nightCount),
    frames: countLabel(s.lightFrameCount),
    topTarget: topTarget ? topTarget.designation || topTarget.displayName : '—',
    mostImaged: mostImaged ? mostImaged.designation || mostImaged.displayName : '—',
    longestNight: durationLabel(longestNight),
  };
}

/** Map a story target (by id) to the per-target OG card model, or null if absent. */
export function toTargetOgModel(story: Story, handle: string, id: string): OgTargetModel | null {
  const o = story.targets?.find((x) => x.id === id);
  if (!o) {
    return null;
  }
  return {
    handle,
    name: o.displayName || o.designation || 'Target',
    type: o.type || o.category || 'Target',
    hours: hoursNum(o.totalIntegrationSeconds),
    nights: countLabel(o.nightCount),
    frames: countLabel(o.lightFrameCount),
    firstLight: monthYear(o.firstLight),
    filters: countLabel((o.filters ?? []).length),
  };
}

/** Map a story equipment item (by id) to the per-equipment OG card model, or null if absent. */
export function toEquipmentOgModel(
  story: Story,
  handle: string,
  id: string,
): OgEquipmentModel | null {
  const e = story.equipment?.find((x) => x.id === id);
  if (!e) {
    return null;
  }
  const year = yearOf(e.firstLight);
  return {
    handle,
    name: e.displayName || 'Equipment',
    kind: e.kind || 'Gear',
    hours: hoursNum(e.totalIntegrationSeconds),
    targets: countLabel(e.targetCount),
    frames: countLabel(e.lightFrameCount),
    mostUsedOn: mostUsedOn(story, e),
    inServiceYear: year ? `Since ${year}` : '—',
  };
}
