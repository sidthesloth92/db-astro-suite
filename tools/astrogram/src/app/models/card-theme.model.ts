/**
 * AstroGram card-theme models.
 *
 * A card theme is a self-contained visual design for the exported
 * infographic card. Each theme is a standalone component that renders the
 * same `ThemeViewData` (mapped from the live `CardData` by
 * `CardThemeBaseDirective`) in its own bespoke layout.
 */

/**
 * Identifier of a selectable card theme. Extend the union (and the
 * `CARD_THEMES` registry) when a new theme ships — nothing else needs to
 * change.
 */
export type CardThemeId =
  // Base set
  | 'pink-nebula'
  | 'obsidian'
  | 'observatory'
  | 'aurora-editorial'
  | 'spectrum'
  | 'halo'
  // Extra set
  | 'blueprint'
  | 'mission-data'
  | 'duotone-poster'
  | 'flight-log'
  // Astro set
  | 'constellation'
  | 'orrery'
  | 'comet'
  | 'ringed-planet'
  // Social set
  | 'headline'
  | 'star-card'
  | 'credits'
  | 'split-stats'
  | 'film-edge'
  | 'emission'
  // Light set
  | 'atlas'
  | 'credits-ivory'
  | 'daylight'
  // Celestial set
  | 'system-line'
  | 'star-trails'
  | 'moon-phases'
  | 'eclipse'
  | 'telrad'
  | 'event-horizon'
  | 'radiant';

/** Accent colours a theme applies to the card document when it is selected. */
export interface CardThemeAccents {
  /** Primary accent hex (e.g. `#ff2d95`). */
  readonly accentColor: string;
  /** Primary accent as an `"r, g, b"` tuple for `rgba()` interpolation. */
  readonly accentColorRgb: string;
  /** Secondary accent hex (e.g. cyan `#00E5FF`). */
  readonly secondaryAccentColor: string;
}

/** One integration (filter) band rendered by every theme's stats section. */
export interface ThemeIntegrationBand {
  /** Display id, e.g. `Hα`, `OIII`, `SII`. */
  readonly id: string;
  /** Long spectral name, e.g. `Hydrogen-α`. */
  readonly greek: string;
  /** Human-readable integration time, e.g. `6h 0m`. */
  readonly time: string;
  /** Frame breakdown, e.g. `72 × 300s`. */
  readonly frames: string;
  /** Band colour (OIII pulls the secondary accent). */
  readonly color: string;
  /** Fraction of the total integration (0–1) for bar/ring fills. */
  readonly pct: number;
}

/** One equipment or software row. `iconIndex` selects the themed line icon. */
export interface ThemeGearItem {
  /** Row label, e.g. `Telescope`, `Camera`, `Capture`. */
  readonly label: string;
  /** Row value, e.g. `Askar 103 APO`. */
  readonly value: string;
  /** Index into the equipment/software icon set (`themeEquipmentIcon`). */
  readonly iconIndex: number;
}

/**
 * The read-only view-model every theme component renders. Mapped from the
 * live `CardData` by `CardThemeBaseDirective` so themes stay presentational
 * and never touch the store or derive integration maths themselves.
 */
export interface ThemeViewData {
  /** Catalogue designation, e.g. `NGC 2237`. */
  readonly objectId: string;
  /** Common name, e.g. `Rosette Nebula`. */
  readonly objectName: string;
  /** Long localised date, e.g. `Wednesday, May 20, 2026`. */
  readonly date: string;
  /** Short upper-case date, e.g. `MAY 20, 2026`. */
  readonly dateShort: string;
  /** Numeric date, e.g. `2026.05.20`. */
  readonly dateNumeric: string;
  /** Capture location, e.g. `Irving, Texas`. */
  readonly location: string;
  /** Optional lat/long string, e.g. `32.81°N · 96.94°W` (empty when unknown). */
  readonly locationCoords: string;
  /** Author handle, e.g. `@astrogram`. */
  readonly author: string;
  /** Short caption / description shown as the card blurb. */
  readonly caption: string;
  /** Enabled integration bands with derived time / frames / pct. */
  readonly integration: readonly ThemeIntegrationBand[];
  /** Total integration time, e.g. `10h 20m`. */
  readonly total: string;
  /** Total integration in seconds with thousands separators, e.g. `37,200s`. */
  readonly totalSec: string;
  /** Equipment rows. */
  readonly equipment: readonly ThemeGearItem[];
  /** Software rows. */
  readonly software: readonly ThemeGearItem[];
  /** Bortle sky-brightness scale value (1–9). */
  readonly bortle: number;
}
