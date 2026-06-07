import type { Ledger } from './ledger.types';
import type {
  ExtractedRows,
  StoryEquipmentRow,
  StoryFilterRow,
  StoryObjectRow,
  StoryTotals,
} from './story.model';

/** Lowercase, collapse whitespace — a stable key for grouping gear. */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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
 * trusting the ledger's own summary block (integrity + anti-fabrication).
 */
function recomputeTotals(ledger: Ledger): StoryTotals {
  let totalIntegrationSeconds = 0;
  let lightFrameCount = 0;
  let firstLight: string | null = null;
  let latestSession: string | null = null;

  for (const object of ledger.objects) {
    totalIntegrationSeconds += object.totalIntegrationSeconds;
    lightFrameCount += object.lightFrameCount;
    firstLight = earliest(firstLight, object.firstLight);
    latestSession = latest(latestSession, object.latestSession);
  }

  const nightCount = new Set(
    ledger.summary.activity.map((a) => a.date).filter(Boolean),
  ).size;

  return {
    totalIntegrationSeconds,
    objectCount: ledger.objects.length,
    nightCount,
    lightFrameCount,
    firstLight,
    latestSession,
  };
}

/** Build story_objects rows from the ledger. */
function extractObjects(ledger: Ledger): StoryObjectRow[] {
  return ledger.objects.map((object) => ({
    objectId: object.id,
    designation: object.designation || object.displayName,
    category: object.category,
    integrationSeconds: object.totalIntegrationSeconds,
    lightFrameCount: object.lightFrameCount,
    nightCount: object.nightCount,
  }));
}

/** Build story_equipment rows from the ledger. */
function extractEquipment(ledger: Ledger): StoryEquipmentRow[] {
  return ledger.equipment.map((item) => ({
    kind: item.kind,
    displayName: item.displayName,
    normalizedKey: normalizeKey(item.displayName),
    integrationSeconds: item.totalIntegrationSeconds,
  }));
}

/** Build story_filters rows from the ledger summary, merging by name. */
function extractFilters(ledger: Ledger): StoryFilterRow[] {
  const frames = new Map<string, number>();
  for (const object of ledger.objects) {
    for (const filter of object.filters) {
      frames.set(filter.name, (frames.get(filter.name) ?? 0) + filter.frames);
    }
  }
  return ledger.summary.filters.map((filter) => ({
    name: filter.name,
    seconds: filter.seconds,
    frames: frames.get(filter.name) ?? 0,
  }));
}

/**
 * Derive all denormalized totals and child rows persisted alongside a story
 * on create. The raw ledger blob is still stored verbatim for rendering.
 */
export function extractRows(ledger: Ledger): ExtractedRows {
  return {
    totals: recomputeTotals(ledger),
    objects: extractObjects(ledger),
    equipment: extractEquipment(ledger),
    filters: extractFilters(ledger),
  };
}
