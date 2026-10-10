/**
 * Adapter: projects a `CelestoryStory` (plus the editable viewer identity) into
 * the render-ready `ShareModel` the canvas renderer consumes. Keeps all
 * story-shape knowledge out of the renderer so the renderer can be a faithful
 * port of the design source.
 */
import type {
  CelestoryStory,
  StoryEquipment,
  StoryFilterIntegration,
  StoryFilterTotal,
  StoryTarget,
} from '../models/story.model';
import type {
  ShareFilterDistribution,
  ShareIdentity,
  ShareModel,
  ShareModelEquipment,
  ShareModelTarget,
} from '../models/share-model.model';
import { filterKeyOf, parseDate } from './share-format.util';

/** Folds an array of `{ name, seconds }` filter totals into a keyed distribution. */
function toDistribution(rows: readonly (StoryFilterTotal | StoryFilterIntegration)[]): ShareFilterDistribution {
  const dist: ShareFilterDistribution = {};
  for (const row of rows) {
    const key = filterKeyOf(row.name);
    if (!key) {
      continue;
    }
    dist[key] = (dist[key] ?? 0) + row.seconds;
  }
  return dist;
}

/** Builds the spec-detail line for a piece of gear (e.g. "540mm · f/5.4"). */
function equipmentDetail(equip: StoryEquipment): string {
  const specs: string[] = [];
  if (equip.focalLengthMm) {
    specs.push(`${equip.focalLengthMm}mm`);
  }
  if (equip.fRatio) {
    specs.push(`f/${equip.fRatio}`);
  }
  return specs.join(' · ');
}

/** Projects one story target into a render-ready share target. */
function toShareTarget(obj: StoryTarget): ShareModelTarget {
  return {
    id: obj.id,
    displayName: obj.displayName,
    designation: obj.designation,
    type: obj.type,
    category: obj.category,
    totalIntegrationSeconds: obj.totalIntegrationSeconds,
    totalLightFrames: obj.lightFrameCount,
    firstLight: obj.firstLight,
    latestSession: obj.latestSession,
    filterTotals: toDistribution(obj.filters),
    sessions: obj.sessions.map((s) => ({
      date: s.date,
      integrationSeconds: s.integrationSeconds,
      lightFrames: s.lightFrameCount,
      equipmentIds: s.equipmentIds,
    })),
  };
}

/** Projects one story equipment item into a render-ready share equipment. */
function toShareEquipment(equip: StoryEquipment): ShareModelEquipment {
  return {
    id: equip.id,
    kind: equip.kind,
    displayName: equip.displayName,
    detail: equipmentDetail(equip),
    totalIntegrationSeconds: equip.totalIntegrationSeconds,
    totalLightFrames: equip.lightFrameCount,
    targetCount: equip.targetCount,
    firstLight: equip.firstLight,
    latestSession: equip.latestSession,
    targetIds: equip.targetIds,
  };
}

/** Builds the render-ready `ShareModel` from a story and the viewer identity. */
export function buildShareModel(story: CelestoryStory, identity: ShareIdentity): ShareModel {
  const summary = story.summary;
  const byCategory: Record<string, { count: number; seconds: number }> = {};
  for (const cat of summary.byCategory ?? []) {
    byCategory[cat.category] = { count: cat.targetCount, seconds: cat.integrationSeconds };
  }
  const activity = (summary.activity ?? [])
    .map((a) => ({ date: a.date, integrationSeconds: a.integrationSeconds }))
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));

  return {
    observer: story.observer ?? '',
    identity,
    summary: {
      totalIntegrationSeconds: summary.totalIntegrationSeconds,
      uniqueTargets: summary.targetCount,
      nightsImaged: summary.nightCount,
      totalLightFrames: summary.lightFrameCount,
      filterDistribution: toDistribution(summary.filters ?? []),
      firstLight: summary.firstLight,
      latestSession: summary.latestSession,
      activity,
      byCategory,
    },
    targets: (story.targets ?? []).map(toShareTarget),
    equipment: (story.equipment ?? []).map(toShareEquipment),
  };
}

/**
 * Narrows a model to a single calendar year — sessions, targets, equipment and
 * summary aggregates recomputed from that year only. Used by the Year-in-Review
 * card and the timeframe pills. `year === 'all'` returns the model unchanged.
 */
export function scopeModelByYear(model: ShareModel, year: number | 'all'): ShareModel {
  if (year === 'all') {
    return model;
  }
  const inYear = (date: string): boolean => parseDate(date)?.getUTCFullYear() === year;

  const targets: ShareModelTarget[] = [];
  for (const obj of model.targets) {
    const sessions = obj.sessions.filter((s) => inYear(s.date));
    if (!sessions.length) {
      continue;
    }
    const totalIntegrationSeconds = sessions.reduce((a, s) => a + s.integrationSeconds, 0);
    const totalLightFrames = sessions.reduce((a, s) => a + s.lightFrames, 0);
    const filterTotals = obj.filterTotals; // per-filter scoping not tracked in sessions; keep aggregate
    const dates = sessions.map((s) => s.date).sort();
    targets.push({
      ...obj,
      totalIntegrationSeconds,
      totalLightFrames,
      firstLight: dates[0],
      latestSession: dates[dates.length - 1],
      filterTotals,
      sessions,
    });
  }

  const byCategory: Record<string, { count: number; seconds: number }> = {};
  for (const obj of targets) {
    const c = (byCategory[obj.category] ??= { count: 0, seconds: 0 });
    c.count += 1;
    c.seconds += obj.totalIntegrationSeconds;
  }
  const activity = model.summary.activity.filter((a) => inYear(a.date));
  const nightKeys = new Set(activity.map((a) => a.date.slice(0, 10)));
  const totalIntegrationSeconds = targets.reduce((a, o) => a + o.totalIntegrationSeconds, 0);
  const totalLightFrames = targets.reduce((a, o) => a + o.totalLightFrames, 0);
  const allDates = activity.map((a) => a.date).sort();

  const targetIds = new Set(targets.map((o) => o.id));
  const equipment = model.equipment
    .map((e) => ({ ...e, targetIds: e.targetIds.filter((id) => targetIds.has(id)) }))
    .filter((e) => e.targetIds.length);

  return {
    ...model,
    summary: {
      ...model.summary,
      totalIntegrationSeconds,
      uniqueTargets: targets.length,
      nightsImaged: nightKeys.size,
      totalLightFrames,
      firstLight: allDates[0] ?? model.summary.firstLight,
      latestSession: allDates[allDates.length - 1] ?? model.summary.latestSession,
      activity,
      byCategory,
    },
    targets,
    equipment,
  };
}
