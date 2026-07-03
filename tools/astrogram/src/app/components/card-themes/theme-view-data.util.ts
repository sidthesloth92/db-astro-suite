import {
  CardData,
  FilterExposure,
  calculateTotalIntegration,
  calculateTotalSeconds,
  formatDuration,
} from '../../models/card-data.model';
import type {
  ThemeGearItem,
  ThemeIntegrationBand,
  ThemeViewData,
} from '../../models/card-theme.model';
import { FILTER_DISPLAY_IDS, SPECTRAL_NAMES } from './theme-view.constants';

/** Splits `"NGC 2237 - Rosette Nebula"` into `["NGC 2237", "Rosette Nebula"]`. */
function splitTitle(title: string): { objectId: string; objectName: string } {
  const idx = title.indexOf(' - ');
  if (idx === -1) {
    return { objectId: '', objectName: title.trim() };
  }
  return {
    objectId: title.slice(0, idx).trim(),
    objectName: title.slice(idx + 3).trim(),
  };
}

/** Formats a filter's display id, mapping `Ha` → `Hα`. */
function displayId(name: string): string {
  return FILTER_DISPLAY_IDS[name.toUpperCase()] ?? name;
}

/** Long spectral name for a filter, falling back to the raw name. */
function spectralName(name: string): string {
  return SPECTRAL_NAMES[name.toUpperCase()] ?? name;
}

/** Long localised date (`Wednesday, May 20, 2026`). Empty when unparseable. */
function longDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Short upper-case date (`MAY 20, 2026`). */
function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

/** Numeric date (`2026.05.20`). */
function numericDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** Maps an enabled filter to its themed integration band. */
function toBand(filter: FilterExposure, totalSeconds: number): ThemeIntegrationBand {
  const seconds = calculateTotalSeconds(filter);
  return {
    id: displayId(filter.name),
    greek: spectralName(filter.name),
    time: formatDuration(seconds),
    frames: `${filter.frames} × ${filter.seconds}s`,
    // Each band renders in its own filter colour (design-faithful and
    // theme-agnostic) — never remapped to a theme accent.
    color: filter.color,
    pct: totalSeconds > 0 ? seconds / totalSeconds : 0,
  };
}

/**
 * Maps the live `CardData` document into the read-only `ThemeViewData`
 * every card theme renders. Keeps all integration maths and formatting in
 * one place so theme components stay purely presentational.
 */
export function buildThemeViewData(data: CardData): ThemeViewData {
  const { objectId, objectName } = splitTitle(data.title);
  const enabled = data.filters.filter((f) => f.enabled && f.frames > 0);
  const totalSeconds = calculateTotalIntegration(data.filters);

  const equipment: ThemeGearItem[] = data.equipment.map((e, i) => ({
    label: e.label,
    value: e.value,
    iconIndex: i,
  }));
  const software: ThemeGearItem[] = data.software.map((s, i) => ({
    label: s.label,
    value: s.name,
    iconIndex: i,
  }));

  return {
    objectId,
    objectName,
    date: longDate(data.date),
    dateShort: shortDate(data.date),
    dateNumeric: numericDate(data.date),
    location: data.location,
    locationCoords: '',
    author: data.author,
    caption: data.description ?? data.caption ?? '',
    integration: enabled.map((f) => toBand(f, totalSeconds)),
    total: formatDuration(totalSeconds),
    totalSec: `${totalSeconds.toLocaleString('en-US')}s`,
    equipment,
    software,
    bortle: data.bortleScale,
  };
}
