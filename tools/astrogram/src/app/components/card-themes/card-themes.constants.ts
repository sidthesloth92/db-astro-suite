import type { SelectItem } from '@db-astro-suite/ui';
import { DEFAULT_LIGHT_THEME_OPACITY } from '../../constants/theme-canvas.constants';
import type { CardThemeColorRoles, CardThemeId } from '../../models/card-theme.model';
import type { CardThemeDefinition } from './card-theme-definition.model';
import { OriginalThemeComponent } from './original/original-theme.component';
import { ObsidianThemeComponent } from './obsidian/obsidian-theme.component';
import { ObservatoryThemeComponent } from './observatory/observatory-theme.component';
import { AuroraEditorialThemeComponent } from './aurora-editorial/aurora-editorial-theme.component';
import { SpectrumThemeComponent } from './spectrum/spectrum-theme.component';
import { HaloThemeComponent } from './halo/halo-theme.component';
import { BlueprintThemeComponent } from './blueprint/blueprint-theme.component';
import { DuotonePosterThemeComponent } from './duotone-poster/duotone-poster-theme.component';
import { FlightLogThemeComponent } from './flight-log/flight-log-theme.component';
import { SystemLineThemeComponent } from './system-line/system-line-theme.component';
import { StarTrailsThemeComponent } from './star-trails/star-trails-theme.component';
import { MoonPhasesThemeComponent } from './moon-phases/moon-phases-theme.component';
import { EclipseThemeComponent } from './eclipse/eclipse-theme.component';
import { TelradThemeComponent } from './telrad/telrad-theme.component';
import { EventHorizonThemeComponent } from './event-horizon/event-horizon-theme.component';
import { RadiantThemeComponent } from './radiant/radiant-theme.component';
import { ConstellationThemeComponent } from './constellation/constellation-theme.component';
import { OrreryThemeComponent } from './orrery/orrery-theme.component';
import { CometThemeComponent } from './comet/comet-theme.component';
import { RingedPlanetThemeComponent } from './ringed-planet/ringed-planet-theme.component';
import { AtlasThemeComponent } from './atlas/atlas-theme.component';
import { CreditsIvoryThemeComponent } from './credits-ivory/credits-ivory-theme.component';
import { DaylightThemeComponent } from './daylight/daylight-theme.component';
import { HeadlineThemeComponent } from './headline/headline-theme.component';
import { StarCardThemeComponent } from './star-card/star-card-theme.component';
import { CreditsThemeComponent } from './credits/credits-theme.component';
import { SplitStatsThemeComponent } from './split-stats/split-stats-theme.component';
import { FilmEdgeThemeComponent } from './film-edge/film-edge-theme.component';
import { EmissionThemeComponent } from './emission/emission-theme.component';

/** Fallback theme id used whenever a requested id has no registry entry. */
export const DEFAULT_CARD_THEME_ID: CardThemeId = 'original';

/** Colour pickers a theme responds to when its entry declares none: both. */
export const DEFAULT_COLOR_ROLES: CardThemeColorRoles = { accent: true, secondary: true };

/**
 * Registry of every selectable card theme, keyed by `CardThemeId`. Adding a
 * theme is one component + one entry here — nothing else changes.
 *
 * Typed `Partial` so the app compiles while themes are ported wave-by-wave;
 * `card-themes.constants.spec.ts` asserts every `CardThemeId` is present.
 */
export const CARD_THEMES: Partial<Record<CardThemeId, CardThemeDefinition>> = {
  original: {
    label: 'Original',
    subtitle: 'Default · the classic card over your own image',
    component: OriginalThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#ff2d95',
      accentColorRgb: '255, 45, 149',
      secondaryAccentColor: '#00E5FF',
    },
    // The original card was authored on the 480 px preview, not the 540 px
    // design-source artboard the ported themes share.
    basis: { width: 480, height: 640 },
  },
  obsidian: {
    label: 'Obsidian Glass',
    subtitle: 'Glassmorphism · cyan/violet aurora',
    component: ObsidianThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#5DD8FF',
      accentColorRgb: '93, 216, 255',
      secondaryAccentColor: '#B97DFF',
    },
  },
  observatory: {
    label: 'Observatory',
    subtitle: 'Copper telemetry on near-black',
    component: ObservatoryThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#D97742',
      accentColorRgb: '217, 119, 66',
      secondaryAccentColor: '#E8C788',
    },
  },
  'aurora-editorial': {
    label: 'Aurora',
    subtitle: 'Modern editorial · weight contrast',
    component: AuroraEditorialThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#D4A574',
      accentColorRgb: '212, 165, 116',
      secondaryAccentColor: '#E5446D',
    },
  },
  spectrum: {
    label: 'Spectrum',
    subtitle: 'Vibrant gradient hero',
    component: SpectrumThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#FF2D95',
      accentColorRgb: '255, 45, 149',
      secondaryAccentColor: '#00E5FF',
    },
  },
  halo: {
    label: 'Halo',
    subtitle: 'Ethereal soft pastels',
    component: HaloThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#C6B6FF',
      accentColorRgb: '198, 182, 255',
      secondaryAccentColor: '#FFB0CE',
    },
  },
  blueprint: {
    label: 'Blueprint',
    subtitle: 'Cyan schematic · technical',
    component: BlueprintThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#4FC3F7',
      accentColorRgb: '79, 195, 247',
      secondaryAccentColor: '#7FD8FF',
    },
  },
  'duotone-poster': {
    label: 'Duotone Poster',
    subtitle: 'Bold riso · indigo + coral',
    component: DuotonePosterThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#FF5E5B',
      accentColorRgb: '255, 94, 91',
      secondaryAccentColor: '#6FE0FF',
    },
  },
  'flight-log': {
    label: 'Flight Log',
    subtitle: 'Boarding-pass ticket',
    component: FlightLogThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#5EE6B8',
      accentColorRgb: '94, 230, 184',
      secondaryAccentColor: '#5EE6B8',
    },
    colorRoles: { accent: true, secondary: false },
  },
  'system-line': {
    label: 'System Line',
    subtitle: 'The solar system as a number line',
    component: SystemLineThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#FFCF6B',
      accentColorRgb: '255, 207, 107',
      secondaryAccentColor: '#B36A18',
    },
  },
  'star-trails': {
    label: 'Star Trails',
    subtitle: 'Exposure arcs around Polaris',
    component: StarTrailsThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#FFF4D8',
      accentColorRgb: '255, 244, 216',
      secondaryAccentColor: '#8A96AC',
    },
    colorRoles: { accent: true, secondary: false },
  },
  'moon-phases': {
    label: 'Moon Phases',
    subtitle: 'Filter fill as lunar phases',
    component: MoonPhasesThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#E8E4DA',
      accentColorRgb: '232, 228, 218',
      secondaryAccentColor: '#95928A',
    },
    colorRoles: { accent: true, secondary: false },
  },
  eclipse: {
    label: 'Eclipse',
    subtitle: 'The data is the corona',
    component: EclipseThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#FFF2D9',
      accentColorRgb: '255, 242, 217',
      secondaryAccentColor: '#94908A',
    },
    colorRoles: { accent: true, secondary: false },
  },
  telrad: {
    label: 'Telrad',
    subtitle: 'Red-light finder reticle',
    component: TelradThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#FF4438',
      accentColorRgb: '255, 68, 56',
      secondaryAccentColor: '#FF7A66',
    },
  },
  'event-horizon': {
    label: 'Event Horizon',
    subtitle: 'Accretion-disk exposure arcs',
    component: EventHorizonThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#FFE9C4',
      accentColorRgb: '255, 233, 196',
      secondaryAccentColor: '#8A4A20',
    },
  },
  radiant: {
    label: 'Radiant',
    subtitle: 'Meteor streaks from the radiant',
    component: RadiantThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#FFC24D',
      accentColorRgb: '255, 194, 77',
      secondaryAccentColor: '#4632A0',
    },
  },
  constellation: {
    label: 'Constellation',
    subtitle: 'Star-chart · bands as bright stars',
    component: ConstellationThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#7FE3FF',
      accentColorRgb: '127, 227, 255',
      secondaryAccentColor: '#FFD79A',
    },
  },
  orrery: {
    label: 'Orrery',
    subtitle: 'Solar-system orbits',
    component: OrreryThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#FFCF6B',
      accentColorRgb: '255, 207, 107',
      secondaryAccentColor: '#9A92B8',
    },
    colorRoles: { accent: true, secondary: false },
  },
  comet: {
    label: 'Comet',
    subtitle: 'Exposure data in the tail',
    component: CometThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#9FE9FF',
      accentColorRgb: '159, 233, 255',
      secondaryAccentColor: '#D8F6FF',
    },
  },
  'ringed-planet': {
    label: 'Ringed Planet',
    subtitle: 'Rings encode integration',
    component: RingedPlanetThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#FFD79A',
      accentColorRgb: '255, 215, 154',
      secondaryAccentColor: '#8A5BC2',
    },
  },
  atlas: {
    label: 'Atlas',
    subtitle: 'Light · vintage star-atlas plate',
    component: AtlasThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#2B2316',
      accentColorRgb: '43, 35, 22',
      secondaryAccentColor: '#6E5F45',
    },
    colorRoles: { accent: false, secondary: false },
    // Light-on-paper: a dark astrophotograph behind pale type would make
    // the card unreadable, so this theme stays opaque by default.
    defaultCardOpacity: DEFAULT_LIGHT_THEME_OPACITY,
  },
  'credits-ivory': {
    label: 'Credits Ivory',
    subtitle: 'Light · one-sheet on paper',
    component: CreditsIvoryThemeComponent,
    landscapeBasisHeight: 560,
    accents: {
      accentColor: '#1A1622',
      accentColorRgb: '26, 22, 34',
      secondaryAccentColor: '#6A6376',
    },
    colorRoles: { accent: false, secondary: false },
    // Light-on-paper: a dark astrophotograph behind pale type would make
    // the card unreadable, so this theme stays opaque by default.
    defaultCardOpacity: DEFAULT_LIGHT_THEME_OPACITY,
  },
  daylight: {
    label: 'Daylight',
    subtitle: 'Light · ink share card',
    component: DaylightThemeComponent,
    landscapeBasisHeight: 520,
    accents: {
      accentColor: '#D6187B',
      accentColorRgb: '214, 24, 123',
      secondaryAccentColor: '#10141F',
    },
    colorRoles: { accent: true, secondary: false },
    // Light-on-paper: a dark astrophotograph behind pale type would make
    // the card unreadable, so this theme stays opaque by default.
    defaultCardOpacity: DEFAULT_LIGHT_THEME_OPACITY,
  },
  headline: {
    label: 'Headline',
    subtitle: 'The wow-stat is the design',
    component: HeadlineThemeComponent,
    landscapeBasisHeight: 460,
    accents: {
      accentColor: '#FF2D95',
      accentColorRgb: '255, 45, 149',
      secondaryAccentColor: '#FFD79A',
    },
  },
  'star-card': {
    label: 'Star Card',
    subtitle: 'Collectible archive card',
    component: StarCardThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#E8C788',
      accentColorRgb: '232, 199, 136',
      secondaryAccentColor: '#C9A86A',
    },
  },
  credits: {
    label: 'Credits',
    subtitle: 'Movie one-sheet billing block',
    component: CreditsThemeComponent,
    landscapeBasisHeight: 560,
    accents: {
      accentColor: '#C9BEDA',
      accentColorRgb: '201, 190, 218',
      secondaryAccentColor: '#783C8C',
    },
  },
  'split-stats': {
    label: 'Split Stats',
    subtitle: 'Fitness-style share card',
    component: SplitStatsThemeComponent,
    landscapeBasisHeight: 500,
    accents: {
      accentColor: '#FF2D95',
      accentColorRgb: '255, 45, 149',
      secondaryAccentColor: '#8B92A6',
    },
    colorRoles: { accent: true, secondary: false },
  },
  'film-edge': {
    label: 'Film Edge',
    subtitle: 'A frame of astro film',
    component: FilmEdgeThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#FFB65C',
      accentColorRgb: '255, 182, 92',
      secondaryAccentColor: '#BE3278',
    },
  },
  emission: {
    label: 'Emission',
    subtitle: 'Spectral lines at true wavelengths',
    component: EmissionThemeComponent,
    landscapeBasisHeight: 480,
    accents: {
      accentColor: '#7FE3FF',
      accentColorRgb: '127, 227, 255',
      secondaryAccentColor: '#E8A451',
    },
    colorRoles: { accent: true, secondary: false },
  },
};

/** Resolves a theme definition by id, falling back to the default theme. */
export function resolveCardTheme(id: CardThemeId): CardThemeDefinition {
  // Non-null: the default theme is always registered.
  return CARD_THEMES[id] ?? CARD_THEMES[DEFAULT_CARD_THEME_ID]!;
}

/** Narrows an arbitrary value to a registered `CardThemeId`. */
export function isCardThemeId(value: unknown): value is CardThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CARD_THEMES, value);
}

/**
 * Picker groups — each entry becomes an `<optgroup>` header wrapping its nested
 * themes. Group order is fixed here; the themes inside each group are sorted
 * alphabetically by `buildCardThemeSelectItems`, so the id order below is not
 * significant. A theme missing from here would not appear in the picker at
 * all, which `card-themes.constants.spec.ts` guards against.
 */
export const CARD_THEME_GROUPS: readonly { label: string; ids: readonly CardThemeId[] }[] = [
  {
    label: 'Social-first',
    ids: [
      'headline',
      'emission',
      'split-stats',
      'star-card',
      'credits',
      'film-edge',
      'atlas',
      'credits-ivory',
      'daylight',
    ],
  },
  {
    label: 'Celestial',
    ids: [
      'system-line',
      'star-trails',
      'moon-phases',
      'eclipse',
      'telrad',
      'event-horizon',
      'radiant',
    ],
  },
  {
    label: 'Infographics',
    ids: [
      'original',
      'obsidian',
      'observatory',
      'aurora-editorial',
      'spectrum',
      'halo',
      'blueprint',
      'duotone-poster',
      'flight-log',
      'constellation',
      'orrery',
      'comet',
      'ringed-planet',
    ],
  },
];

/**
 * Builds the grouped `SelectItem[]` list for the Layout panel's theme picker.
 * Labels are read back out of `CARD_THEMES`, so renaming a theme in the
 * registry can never leave a stale label behind in the picker.
 *
 * Within each group the options are sorted alphabetically by label here, at
 * build time, rather than by hand in `CARD_THEME_GROUPS`: the groups record
 * *membership*, and a theme added to one lands in the right place without
 * anyone having to remember the ordering rule.
 */
export function buildCardThemeSelectItems(): readonly SelectItem[] {
  return CARD_THEME_GROUPS.map((group) => ({
    label: group.label,
    // `flatMap` over a lookup rather than `filter` + `!`: the registry is
    // typed `Partial`, and this keeps the undefined case handled in the type
    // system instead of asserted away.
    options: group.ids
      .flatMap((id) => {
        const definition = CARD_THEMES[id];
        return definition ? [{ value: id, label: definition.label }] : [];
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })),
  }));
}
