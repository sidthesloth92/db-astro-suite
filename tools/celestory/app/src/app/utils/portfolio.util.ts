/**
 * Pure selectors that turn a CelestoryStory into the hero/section view-models:
 * identity, year span, highlights, filter distribution and the activity heat
 * strip. No rendering, no side effects.
 */
import { FILTER_META, FILTER_ORDER } from '../models/filter.constants';
import {
  MILESTONE_FRAMES,
  MILESTONE_HOURS,
  MILESTONE_NIGHTS,
  MILESTONE_OBJECTS,
} from '../models/heat-milestone.constants';
import type { CelestoryStory, StoryActivityEntry, StoryFilterTotal } from '../models/story.model';
import type {
  FilterRow,
  FilterSlice,
  HeatMilestone,
  HeatMonthTick,
  HeatNight,
  HeatStripView,
  HeroIdentity,
  Highlight,
  SessionView,
  YearSpan,
} from '../models/portfolio-view.types';
import type { ShareCardData, ShareCarouselData, ShareDomeTarget } from '../models/share.types';
import { filterColor, filterLabel } from './filter-color.util';
import { formatCompact, formatCount, formatDuration, formatHours } from './format.util';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Parse an ISO `YYYY-MM-DD` date into UTC parts (timezone-safe). */
function ymd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) {
    return null;
  }
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
}

/** Days between two ISO dates (a→b). */
function daysBetween(a: string, b: string): number {
  const pa = ymd(a);
  const pb = ymd(b);
  if (!pa || !pb) {
    return 0;
  }
  return Math.round((Date.UTC(pb.y, pb.m, pb.d) - Date.UTC(pa.y, pa.m, pa.d)) / 86400000);
}

/** Short date, e.g. "Aug 1". */
export function fmtDateShort(value: string): string {
  const p = ymd(value);
  return p ? `${MONTHS_SHORT[p.m]} ${p.d}` : '—';
}

/** Long date, e.g. "Aug 1, 2025". */
export function fmtDate(value: string): string {
  const p = ymd(value);
  return p ? `${MONTHS_SHORT[p.m]} ${p.d}, ${p.y}` : '—';
}

/** Human-readable byte size, e.g. "6.9 GB". */
export function fmtBytes(bytes: number): string {
  const b = bytes > 0 ? bytes : 0;
  if (b < 1024) {
    return `${b} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)) - 1);
  return `${(b / Math.pow(1024, i + 1)).toFixed(1)} ${units[i]}`;
}

/** A date range, e.g. "Feb 1, 2025 → May 6, 2026". */
export function fmtRange(a: string, b: string): string {
  if (!a && !b) {
    return '—';
  }
  if (!a) {
    return fmtDate(b);
  }
  if (!b) {
    return fmtDate(a);
  }
  return `${fmtDate(a)} → ${fmtDate(b)}`;
}

/** Maps an object category to a glyph icon name (galaxy / star / telescope). */
export function categoryIcon(category: string): 'galaxy' | 'star' | 'telescope' {
  if (category.includes('Galaxy')) {
    return 'galaxy';
  }
  if (category.includes('Cluster') || category === 'Star' || category === 'Comet') {
    return 'star';
  }
  return 'telescope';
}

/** Title-case label for a gear kind ("Camera" | "Telescope" | "Mount"). */
function gearKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'camera':
      return 'Camera';
    case 'mount':
      return 'Mount';
    default:
      return 'Telescope';
  }
}

/** "N cameras · N telescopes[ · N mounts]" summary of a gear list (mounts shown only when present). */
function gearSummaryLine(equipment: readonly { kind: string }[]): string {
  const count = (k: string): number =>
    equipment.filter((e) => e.kind.toLowerCase() === k).length;
  const parts = [
    `${formatCount(count('camera'))} cameras`,
    `${formatCount(count('telescope'))} telescopes`,
  ];
  const mounts = count('mount');
  if (mounts > 0) {
    parts.push(`${formatCount(mounts)} mounts`);
  }
  return parts.join(' · ');
}

/** First→latest year span, or null. */
export function yearSpan(story: CelestoryStory): YearSpan | null {
  const from = ymd(story.summary.firstLight)?.y;
  const to = ymd(story.summary.latestSession)?.y;
  return from && to ? { from, to } : null;
}

/** Number of seasons (inclusive year span), or null. */
export function seasonCount(story: CelestoryStory): number | null {
  const span = yearSpan(story);
  return span ? span.to - span.from + 1 : null;
}

/**
 * Resolve the hero identity. Prefers the story's observer/site, then the
 * published handle, then a friendly fallback.
 */
export function heroIdentity(story: CelestoryStory, handle: string): HeroIdentity {
  const observerParts = (story.observer || '').split('—').map((s) => s.trim());
  const name = observerParts[0] || story.observer || (handle ? handle : 'Astrophotographer');
  const place = observerParts[1] || story.site || '';
  const firstName = name.split(' ')[0];
  return {
    name,
    handle: handle ? `@${handle}` : '',
    place,
    tagline: firstName ? `${firstName}’s journey under the stars` : 'A journey under the stars',
  };
}

/** The "Highlights of the journey" cards. */
export function highlights(story: CelestoryStory): Highlight[] {
  const out: Highlight[] = [];
  const objects = story.objects;
  const activity = story.summary.activity;

  const top = objects.reduce<CelestoryStory['objects'][number] | null>(
    (best, o) => (!best || o.totalIntegrationSeconds > best.totalIntegrationSeconds ? o : best),
    null,
  );
  if (top) {
    out.push({
      kind: 'top',
      key: 'Top target',
      value: top.designation || top.displayName,
      sub: formatDuration(top.totalIntegrationSeconds),
      objectId: top.id,
    });
  }

  const bigNight = activity.reduce<CelestoryStory['summary']['activity'][number] | null>(
    (best, a) => (!best || a.integrationSeconds > best.integrationSeconds ? a : best),
    null,
  );
  if (bigNight) {
    out.push({
      kind: 'bigNight',
      key: 'Biggest night',
      value: fmtDateShort(bigNight.date),
      sub: formatDuration(bigNight.integrationSeconds),
    });
  }

  let topFilter = '';
  let topFilterSecs = 0;
  for (const f of story.summary.filters) {
    if (f.seconds > topFilterSecs) {
      topFilterSecs = f.seconds;
      topFilter = f.name;
    }
  }
  if (topFilter) {
    out.push({
      kind: 'filter',
      key: 'Go-to filter',
      value: filterLabel(topFilter),
      sub: formatDuration(topFilterSecs),
      color: filterColor(topFilter),
    });
  }

  const byMonth = new Map<string, number>();
  for (const a of activity) {
    const p = ymd(a.date);
    if (!p) {
      continue;
    }
    const key = `${p.y}-${p.m}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + a.integrationSeconds);
  }
  let bestMonth = '';
  let bestMonthSecs = 0;
  for (const [key, secs] of byMonth) {
    if (secs > bestMonthSecs) {
      bestMonthSecs = secs;
      bestMonth = key;
    }
  }
  if (bestMonth) {
    out.push({
      kind: 'month',
      key: 'Busiest month',
      value: MONTHS_LONG[+bestMonth.split('-')[1]],
      sub: formatDuration(bestMonthSecs),
    });
  }
  return out;
}

/** Proportional filter-distribution slices, in canonical order. */
export function filterSlices(filters: readonly StoryFilterTotal[]): FilterSlice[] {
  const byName = new Map(filters.map((f) => [f.name, f.seconds]));
  const ordered = [
    ...FILTER_ORDER.filter((n) => (byName.get(n) ?? 0) > 0),
    ...filters.filter((f) => !(f.name in FILTER_META) && f.seconds > 0).map((f) => f.name),
  ];
  const total = ordered.reduce((sum, n) => sum + (byName.get(n) ?? 0), 0) || 1;
  return ordered.map((name) => {
    const seconds = byName.get(name) ?? 0;
    return { name, label: filterLabel(name), color: filterColor(name), seconds, pct: (seconds / total) * 100 };
  });
}

/** Per-filter integration rows for an object's detail (sorted by time). */
export function filterRows(filters: readonly { name: string; seconds: number; frames: number }[]): FilterRow[] {
  const used = filters.filter((f) => f.seconds > 0);
  const total = used.reduce((s, f) => s + f.seconds, 0) || 1;
  const max = used.reduce((m, f) => Math.max(m, f.seconds), 1);
  return [...used]
    .sort((a, b) => b.seconds - a.seconds)
    .map((f) => ({
      name: f.name,
      label: filterLabel(f.name),
      color: filterColor(f.name),
      seconds: f.seconds,
      frames: f.frames,
      avg: f.frames ? Math.round(f.seconds / f.frames) : 0,
      pct: Math.round((f.seconds / total) * 100),
      frac: f.seconds / max,
    }));
}

/** Resolve an object's sessions into timeline view-models (gear names + pills). */
export function sessionViews(
  sessions: readonly {
    date: string;
    integrationSeconds: number;
    lightFrameCount: number;
    filters: readonly { name: string; seconds: number }[];
    equipmentIds: readonly string[];
    focalLengthMm?: number | null;
    fRatio?: number | null;
  }[],
  equipNames: ReadonlyMap<string, string>,
): SessionView[] {
  return [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      integrationSeconds: s.integrationSeconds,
      lightFrameCount: s.lightFrameCount,
      filters: [...s.filters]
        .filter((f) => f.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds)
        .map((f) => ({ name: f.name, label: filterLabel(f.name), color: filterColor(f.name) })),
      gearNames: s.equipmentIds.map((id) => equipNames.get(id) ?? id),
      spec: sessionSpec(s.focalLengthMm ?? null, s.fRatio ?? null),
    }));
}

/** Format a session's telescope spec line ("250mm · f/4.9"); "" when unknown. */
function sessionSpec(focalLengthMm: number | null, fRatio: number | null): string {
  const parts: string[] = [];
  if (focalLengthMm) {
    parts.push(`${focalLengthMm}mm`);
  }
  if (fRatio) {
    parts.push(`f/${fRatio}`);
  }
  return parts.join(' · ');
}

/** A map of equipment id → display name. */
export function equipNameMap(story: CelestoryStory): Map<string, string> {
  return new Map(story.equipment.map((e) => [e.id, e.displayName]));
}

/** Build the data a share card renders from the story. */
export function buildShareCardData(story: CelestoryStory, handle: string, displayUrl: string): ShareCardData {
  const s = story.summary;
  const span = yearSpan(story);
  const yearLabel = span
    ? span.from === span.to
      ? `${span.from}`
      : `${span.from}–${String(span.to).slice(2)}`
    : '';
  return {
    name: heroIdentity(story, handle).name,
    yearLabel,
    heroTime: formatDuration(s.totalIntegrationSeconds),
    stats: [
      { v: formatCount(s.objectCount), k: 'OBJECTS' },
      { v: formatCount(s.nightCount), k: 'NIGHTS' },
      { v: formatCompact(s.lightFrameCount), k: 'FRAMES' },
    ],
    filters: filterSlices(s.filters).map((f) => ({ label: f.label, color: f.color, pct: f.pct })),
    url: displayUrl,
  };
}

/** Build the data the 6-slide share carousel renders. */
export function buildShareCarouselData(
  story: CelestoryStory,
  handle: string,
  displayUrl: string,
): ShareCarouselData {
  const s = story.summary;
  const span = yearSpan(story);
  const yearLabel = span
    ? span.from === span.to
      ? `${span.from}`
      : `${span.from}–${String(span.to).slice(2)}`
    : '';
  const cats = [...s.byCategory].filter((c) => c.objectCount > 0).sort((a, b) => b.objectCount - a.objectCount);
  const domeTargets: ShareDomeTarget[] = [];
  for (const o of [...story.objects].sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds)) {
    if (typeof o.ra === 'number' && typeof o.dec === 'number') {
      domeTargets.push({
        label: o.designation || o.displayName,
        ra: o.ra,
        dec: o.dec,
        hours: o.totalIntegrationSeconds / 3600,
        category: o.category,
      });
      if (domeTargets.length >= 12) {
        break;
      }
    }
  }
  const byName = new Map(s.filters.map((f) => [f.name, f.seconds]));
  const filterNames = [
    ...FILTER_ORDER.filter((n) => (byName.get(n) ?? 0) > 0),
    ...s.filters.filter((f) => !FILTER_ORDER.includes(f.name) && f.seconds > 0).map((f) => f.name),
  ];
  return {
    name: heroIdentity(story, handle).name,
    yearLabel,
    inReview: yearLabel.includes('–') ? 'IN REVIEW' : 'YEAR IN REVIEW',
    heroTime: formatDuration(s.totalIntegrationSeconds),
    clearNights: `≈ ${(s.totalIntegrationSeconds / 28800).toFixed(1)} clear nights`,
    objectsStr: formatCount(s.objectCount),
    nightsStr: formatCount(s.nightCount),
    objectCountStr: formatCount(s.objectCount),
    equipmentCountStr: formatCount(story.equipment.length),
    nightsBigStr: formatCount(s.nightCount),
    subObjects: `unique targets across ${cats.length} categories`,
    subEquip: gearSummaryLine(story.equipment),
    rangeStr: fmtRange(s.firstLight, s.latestSession),
    categories: cats.slice(0, 6).map((c) => ({
      label: c.category,
      sub: `${formatHours(c.integrationSeconds)}h integration`,
      valStr: formatCount(c.objectCount),
      value: c.objectCount,
    })),
    equipment: [...story.equipment]
      .sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds)
      .slice(0, 6)
      .map((e) => ({
        label: e.displayName,
        sub: gearKindLabel(e.kind),
        valStr: formatDuration(e.totalIntegrationSeconds),
        value: e.totalIntegrationSeconds,
      })),
    topTargets: [...story.objects]
      .sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds)
      .slice(0, 6)
      .map((o) => ({
        label: o.designation || o.displayName,
        sub: o.type || o.category,
        valStr: formatDuration(o.totalIntegrationSeconds),
        value: o.totalIntegrationSeconds,
      })),
    filters: filterNames.map((n) => ({ name: n, label: filterLabel(n), color: filterColor(n), seconds: byName.get(n) ?? 0 })),
    activity: s.activity.map((a) => ({ date: a.date, seconds: a.integrationSeconds })),
    domeTargets,
    url: displayUrl,
  };
}

/** The activity heat-strip view-model (night dots + month ticks + caption). */
export function heatStrip(story: CelestoryStory): HeatStripView {
  const activity = [...story.summary.activity].sort((a, b) => a.date.localeCompare(b.date));
  if (activity.length === 0) {
    return { nights: [], months: [], milestones: [], spanMonths: 1, caption: 'No session activity recorded.' };
  }
  const start = activity[0].date;
  const end = activity[activity.length - 1].date;
  const span = Math.max(1, daysBetween(start, end));
  const max = activity.reduce((m, a) => Math.max(m, a.integrationSeconds), 1);

  const nights: HeatNight[] = activity.map((a) => ({
    date: a.date,
    integrationSeconds: a.integrationSeconds,
    lightFrameCount: a.lightFrameCount,
    objectCount: a.objectIds.length,
    frac: a.integrationSeconds / max,
    leftPct: (daysBetween(start, a.date) / span) * 100,
  }));

  const months: HeatMonthTick[] = [];
  const ps = ymd(start);
  const pe = ymd(end);
  let spanMonths = 1;
  if (ps && pe) {
    spanMonths = Math.max(1, (pe.y - ps.y) * 12 + (pe.m - ps.m) + 1);
    let y = ps.y;
    let m = ps.m;
    let prevYear = -1;
    while (y < pe.y || (y === pe.y && m <= pe.m)) {
      const at = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const left = (daysBetween(start, at) / span) * 100;
      if (left >= 0 && left <= 100) {
        const label = y !== prevYear ? `${MONTHS_SHORT[m]} ’${String(y).slice(2)}` : MONTHS_SHORT[m];
        months.push({ leftPct: left, label });
        prevYear = y;
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  return {
    nights,
    months,
    milestones: buildMilestones(activity, start, span),
    spanMonths,
    caption: `${activity.length} nights imaged · ${fmtRange(start, end)}`,
  };
}

/**
 * Walks nights in chronological order and surfaces threshold-crossing
 * milestones — cumulative hours logged, cumulative light frames, the Nth distinct
 * object first imaged, the Nth night imaged, plus the single best-integration
 * night. Each milestone is pinned to the night it occurred on.
 */
function buildMilestones(
  activity: StoryActivityEntry[],
  start: string,
  span: number,
): HeatMilestone[] {
  const milestones: HeatMilestone[] = [];
  const at = (date: string): number => (daysBetween(start, date) / span) * 100;

  const hours = [...MILESTONE_HOURS];
  const frames = [...MILESTONE_FRAMES];
  const objects = [...MILESTONE_OBJECTS];
  const nights = [...MILESTONE_NIGHTS];
  const seen = new Set<string>();
  let cumSeconds = 0;
  let cumFrames = 0;

  let bestIndex = 0;
  let bestSeconds = -1;
  activity.forEach((a, i) => {
    if (a.integrationSeconds > bestSeconds) {
      bestSeconds = a.integrationSeconds;
      bestIndex = i;
    }
  });

  activity.forEach((a, i) => {
    const left = at(a.date);
    cumSeconds += a.integrationSeconds;
    cumFrames += a.lightFrameCount;
    a.objectIds.forEach((id) => seen.add(id));
    const cumHours = cumSeconds / 3600;
    const objectCount = seen.size;
    const nightNo = i + 1;

    while (hours.length && cumHours >= hours[0]) {
      const t = hours[0];
      hours.shift();
      milestones.push({ date: a.date, leftPct: left, kind: 'hours', big: `${t}h`, small: 'LOGGED' });
    }
    while (frames.length && cumFrames >= frames[0].at) {
      const f = frames[0];
      frames.shift();
      milestones.push({ date: a.date, leftPct: left, kind: 'frames', big: f.label, small: 'FRAMES' });
    }
    while (objects.length && objectCount >= objects[0]) {
      const t = objects[0];
      objects.shift();
      milestones.push({ date: a.date, leftPct: left, kind: 'object', big: `${t}th`, small: 'OBJECT' });
    }
    while (nights.length && nightNo >= nights[0]) {
      const t = nights[0];
      nights.shift();
      milestones.push({ date: a.date, leftPct: left, kind: 'night', big: `${t}th`, small: 'NIGHT' });
    }
  });

  const best = activity[bestIndex];
  if (best) {
    milestones.push({ date: best.date, leftPct: at(best.date), kind: 'best', big: 'Best', small: 'NIGHT' });
  }

  return milestones;
}
