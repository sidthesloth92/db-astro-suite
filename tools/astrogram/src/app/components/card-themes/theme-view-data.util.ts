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
import {
  BORTLE_DESCRIPTORS,
  BROADBAND_FILTERS,
  FILTER_DISPLAY_IDS,
  NARROWBAND_FILTERS,
  PALETTE_LETTERS,
  SPECTRAL_NAMES,
} from './theme-view.constants';

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

/** Sky descriptor for a Bortle value, clamped into the 1–9 scale. */
function bortleLabel(value: number): string {
  const clamped = Math.min(9, Math.max(1, Math.round(value)));
  return BORTLE_DESCRIPTORS[clamped - 1] ?? '';
}

/**
 * Kind of the enabled bands, lower-cased for use mid-sentence. Empty when
 * nothing is enabled so themes can drop the phrase entirely rather than
 * render "A  study".
 */
function bandKind(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.every((name) => NARROWBAND_FILTERS.includes(name))) return 'narrowband';
  if (names.every((name) => BROADBAND_FILTERS.includes(name))) return 'broadband';
  return 'mixed';
}

/**
 * Palette code for the enabled bands. Known filters emit their letter in
 * canonical L-R-G-B-S-H-O order, so `{L,R,G,B}` reads `LRGB` and
 * `{SII,Ha,OIII}` reads `SHO` however the user enabled them. Custom filter
 * rows contribute their first letter, appended after the known ones.
 */
function paletteLabel(names: readonly string[]): string {
  if (names.length === 0) return '';

  const known = Object.entries(PALETTE_LETTERS)
    .filter(([filter]) => names.includes(filter))
    .map(([, letter]) => letter)
    .join('');
  const custom = names
    .filter((name) => !(name in PALETTE_LETTERS))
    .map((name) => name.charAt(0).toUpperCase())
    .join('');

  // Hα + OIII alone is conventionally written HOO — the OIII channel carries
  // both green and blue — which plain canonical ordering would render `HO`.
  return `${known === 'HO' ? 'HOO' : known}${custom}`;
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
  const enabledNames = enabled.map((f) => f.name.toUpperCase());
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
    bortleLabel: bortleLabel(data.bortleScale),
    paletteLabel: paletteLabel(enabledNames),
    bandKind: bandKind(enabledNames),
    bandNames: enabled.map((f) => displayId(f.name)).join(' · '),
  };
}
