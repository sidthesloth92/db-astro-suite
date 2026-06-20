import type { Story } from './story.types';
import type {
  ExtractedRows,
  StoryEquipmentMonthRow,
  StoryEquipmentRow,
  StoryFilterMonthRow,
  StoryFilterRow,
  StoryObjectMonthRow,
  StoryObjectRow,
  StoryTotals,
} from './story.model';

/** Lowercase, collapse whitespace — a stable key for grouping gear. */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** First day of the month for an ISO date, e.g. `2025-10-16` → `2025-10-01`.
 * Returns '' for empty/malformed dates so the caller can skip them. */
function monthStart(date: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(date.trim());
  return match ? `${match[1]}-${match[2]}-01` : '';
}

/** Min of two ISO date strings, ignoring empties. */
function earliest(a: string | null, b: string): string | null {
  if (!b) return a;
  if (!a) return b;
  return b < a ? b : a;
}

/** Max of two ISO date strings, ignoring empties. */
function latest(a: string | null, b: string): string | null {
  if (!b) return a;
  if (!a) return b;
  return b > a ? b : a;
}

/**
 * Recompute headline totals from the validated objects/activity rather than
 * trusting the story's own summary block (integrity + anti-fabrication).
 */
function recomputeTotals(story: Story): StoryTotals {
  let totalIntegrationSeconds = 0;
  let lightFrameCount = 0;
  let firstLight: string | null = null;
  let latestSession: string | null = null;

  for (const object of story.objects) {
    totalIntegrationSeconds += object.totalIntegrationSeconds;
    lightFrameCount += object.lightFrameCount;
    firstLight = earliest(firstLight, object.firstLight);
    latestSession = latest(latestSession, object.latestSession);
  }

  const nightCount = new Set(
    story.summary.activity.map((a) => a.date).filter(Boolean),
  ).size;

  return {
    totalIntegrationSeconds,
    objectCount: story.objects.length,
    nightCount,
    lightFrameCount,
    firstLight,
    latestSession,
  };
}

/** Build story_objects rows from the story. */
function extractObjects(story: Story): StoryObjectRow[] {
  return story.objects.map((object) => ({
    objectId: object.id,
    designation: object.designation || object.displayName,
    category: object.category,
    integrationSeconds: object.totalIntegrationSeconds,
    lightFrameCount: object.lightFrameCount,
    nightCount: object.nightCount,
  }));
}

/** Build story_equipment rows from the story. */
function extractEquipment(story: Story): StoryEquipmentRow[] {
  return story.equipment.map((item) => ({
    equipmentId: item.id,
    kind: item.kind,
    subtype: item.subtype,
    displayName: item.displayName,
    normalizedKey: normalizeKey(item.displayName),
    integrationSeconds: item.totalIntegrationSeconds,
    lightFrameCount: item.lightFrameCount,
    focalLengthMm: item.focalLengthMm,
    fRatio: item.fRatio,
  }));
}

/**
 * Roll each object's per-night sessions up to one row per (object, month),
 * powering the month/seasonality leaderboards. Sessions with no parseable date
 * are skipped; integration and frames are summed within each month bucket.
 */
function extractObjectMonths(story: Story): StoryObjectMonthRow[] {
  const buckets = new Map<string, StoryObjectMonthRow>();
  for (const object of story.objects) {
    const designation = object.designation || object.displayName;
    for (const session of object.sessions) {
      const month = monthStart(session.date);
      if (!month) continue;
      const key = `${object.id}|${month}`;
      const existing = buckets.get(key);
      if (existing) {
        buckets.set(key, {
          ...existing,
          integrationSeconds:
            existing.integrationSeconds + session.integrationSeconds,
          lightFrameCount: existing.lightFrameCount + session.lightFrameCount,
        });
      } else {
        buckets.set(key, {
          objectId: object.id,
          designation,
          category: object.category,
          month,
          integrationSeconds: session.integrationSeconds,
          lightFrameCount: session.lightFrameCount,
        });
      }
    }
  }
  return [...buckets.values()];
}

/**
 * Roll each object's per-night session filters up to one row per (filter, month),
 * powering the time-windowed filters board. Sessions with no parseable date are
 * skipped; seconds and frames are summed within each (name, month) bucket.
 */
function extractFilterMonths(story: Story): StoryFilterMonthRow[] {
  const buckets = new Map<string, StoryFilterMonthRow>();
  for (const object of story.objects) {
    for (const session of object.sessions) {
      const month = monthStart(session.date);
      if (!month) continue;
      for (const filter of session.filters) {
        const key = `${filter.name}|${month}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.seconds += filter.seconds;
          existing.frames += filter.frames;
        } else {
          buckets.set(key, {
            name: filter.name,
            month,
            seconds: filter.seconds,
            frames: filter.frames,
          });
        }
      }
    }
  }
  return [...buckets.values()];
}

/**
 * Roll each object's per-night sessions up to one row per (equipment, month),
 * powering the time-windowed equipment boards. Every gear id used on a night is
 * attributed that night's integration and frames (a session usually shares one
 * rig); join story_equipment for kind/subtype/display_name.
 */
function extractEquipmentMonths(story: Story): StoryEquipmentMonthRow[] {
  const buckets = new Map<string, StoryEquipmentMonthRow>();
  for (const object of story.objects) {
    for (const session of object.sessions) {
      const month = monthStart(session.date);
      if (!month) continue;
      for (const equipmentId of session.equipmentIds) {
        const key = `${equipmentId}|${month}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.integrationSeconds += session.integrationSeconds;
          existing.lightFrameCount += session.lightFrameCount;
        } else {
          buckets.set(key, {
            equipmentId,
            month,
            integrationSeconds: session.integrationSeconds,
            lightFrameCount: session.lightFrameCount,
          });
        }
      }
    }
  }
  return [...buckets.values()];
}

/** Build story_filters rows from the story summary, merging by name. */
function extractFilters(story: Story): StoryFilterRow[] {
  const frames = new Map<string, number>();
  for (const object of story.objects) {
    for (const filter of object.filters) {
      frames.set(filter.name, (frames.get(filter.name) ?? 0) + filter.frames);
    }
  }
  return story.summary.filters.map((filter) => ({
    name: filter.name,
    seconds: filter.seconds,
    frames: frames.get(filter.name) ?? 0,
  }));
}

/**
 * Derive all denormalized totals and child rows persisted alongside a story
 * on create. The raw story blob is still stored verbatim for rendering.
 */
export function extractRows(story: Story): ExtractedRows {
  return {
    totals: recomputeTotals(story),
    objects: extractObjects(story),
    equipment: extractEquipment(story),
    filters: extractFilters(story),
    objectMonths: extractObjectMonths(story),
    filterMonths: extractFilterMonths(story),
    equipmentMonths: extractEquipmentMonths(story),
  };
}
