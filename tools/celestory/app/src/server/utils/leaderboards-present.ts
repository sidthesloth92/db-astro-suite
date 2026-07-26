/**
 * Presenter — turns canonical leaderboard query rows into render-ready entries.
 * All display mapping lives here (value→display-unit conversion, tag text, sub
 * line) so the frontend paints the result verbatim. The frontend does only
 * numeric formatting (thousands/`k`) and theme-token colouring.
 */
import { PALETTE_LABELS, SUBTYPE_LABELS } from './leaderboards.constants';
import { classifyPalette } from './leaderboards.util';
import type { LeaderboardEntry } from './leaderboards.model';
import type { BoardConfig, RenderEntry } from './leaderboards-board.model';

const SECONDS_PER_HOUR = 3600;

/** Apply a board's value transform (seconds→whole hours, or pass-through). */
function transformValue(config: BoardConfig, value: number): number {
  if (config.transform === 'hours') {
    return Math.round(value / SECONDS_PER_HOUR);
  }
  return Math.round(value);
}

/** Format a telescope spec sub line, e.g. "840mm · f/7"; undefined when unknown. */
function formatSpec(meta: Record<string, string | number>): string | undefined {
  const parts: string[] = [];
  const focal = meta['focalLengthMm'];
  const fRatio = meta['fRatio'];
  if (typeof focal === 'number' && focal > 0) {
    parts.push(`${Math.round(focal)}mm`);
  }
  if (typeof fRatio === 'number' && fRatio > 0) {
    parts.push(`f/${fRatio}`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Resolve the entry's tag chip text from the board's tag source. */
function tagFor(config: BoardConfig, entry: LeaderboardEntry): string | undefined {
  const meta = entry.meta ?? {};
  switch (config.tag) {
    case 'category': {
      const category = meta['category'];
      return category ? String(category) : undefined;
    }
    case 'subtype': {
      const subtype = meta['subtype'];
      if (!subtype) {
        return undefined;
      }
      const key = String(subtype);
      return SUBTYPE_LABELS[key] ?? key;
    }
    case 'palette':
      return PALETTE_LABELS[classifyPalette(entry.label)];
    default:
      return undefined;
  }
}

/** Resolve the entry's sub line from the board's sub source. */
function subFor(config: BoardConfig, entry: LeaderboardEntry): string | undefined {
  const meta = entry.meta ?? {};
  switch (config.sub) {
    case 'designation': {
      const designation = meta['designation'];
      return designation ? String(designation) : undefined;
    }
    case 'spec':
      return formatSpec(meta);
    default:
      return undefined;
  }
}

/** Present one canonical entry as a render-ready row. */
export function presentEntry(
  config: BoardConfig,
  entry: LeaderboardEntry,
): RenderEntry {
  const rendered: RenderEntry = {
    rank: entry.rank,
    label: entry.label,
    value: transformValue(config, entry.value),
    unit: config.unit,
  };
  const tag = tagFor(config, entry);
  if (tag) {
    rendered.tag = tag;
  }
  const sub = subFor(config, entry);
  if (sub) {
    rendered.sub = sub;
  }
  return rendered;
}

/** Present a full board's worth of canonical entries. */
export function presentBoard(
  config: BoardConfig,
  entries: LeaderboardEntry[],
): RenderEntry[] {
  return entries.map((entry) => presentEntry(config, entry));
}
