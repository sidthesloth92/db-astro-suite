import type { SelectItem } from '@db-astro-suite/ui';
import type { CardThemeId } from '../../models/card-theme.model';
import type { CardThemeDefinition } from './card-theme-definition.model';
import { PinkNebulaThemeComponent } from './pink-nebula/pink-nebula-theme.component';
import { ObsidianThemeComponent } from './obsidian/obsidian-theme.component';
import { ObservatoryThemeComponent } from './observatory/observatory-theme.component';
import { AuroraEditorialThemeComponent } from './aurora-editorial/aurora-editorial-theme.component';
import { SpectrumThemeComponent } from './spectrum/spectrum-theme.component';
import { HaloThemeComponent } from './halo/halo-theme.component';
import { BlueprintThemeComponent } from './blueprint/blueprint-theme.component';
import { MissionDataThemeComponent } from './mission-data/mission-data-theme.component';
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
export const DEFAULT_CARD_THEME_ID: CardThemeId = 'pink-nebula';

/**
 * Registry of every selectable card theme, keyed by `CardThemeId`. Adding a
 * theme is one component + one entry here — nothing else changes.
 *
 * Typed `Partial` so the app compiles while themes are ported wave-by-wave;
 * `card-themes.constants.spec.ts` asserts every `CardThemeId` is present.
 */
export const CARD_THEMES: Partial<Record<CardThemeId, CardThemeDefinition>> = {
  'pink-nebula': {
    label: 'Pink Nebula',
    subtitle: 'Default · the original Astrogram card',
    component: PinkNebulaThemeComponent,
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
    accents: {
      accentColor: '#4FC3F7',
      accentColorRgb: '79, 195, 247',
      secondaryAccentColor: '#7FD8FF',
    },
  },
  'mission-data': {
    label: 'Mission Data',
    subtitle: 'Dashboard tiles · big stats',
    component: MissionDataThemeComponent,
    accents: {
      accentColor: '#A6F05A',
      accentColorRgb: '166, 240, 90',
      secondaryAccentColor: '#34E1E8',
    },
  },
  'duotone-poster': {
    label: 'Duotone Poster',
    subtitle: 'Bold riso · indigo + coral',
    component: DuotonePosterThemeComponent,
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
    accents: {
      accentColor: '#5EE6B8',
      accentColorRgb: '94, 230, 184',
      secondaryAccentColor: '#5EE6B8',
    },
  },
  'system-line': {
    label: 'System Line',
    subtitle: 'The solar system as a number line',
    component: SystemLineThemeComponent,
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
    accents: {
      accentColor: '#FFF4D8',
      accentColorRgb: '255, 244, 216',
      secondaryAccentColor: '#8A96AC',
    },
  },
  'moon-phases': {
    label: 'Moon Phases',
    subtitle: 'Filter fill as lunar phases',
    component: MoonPhasesThemeComponent,
    accents: {
      accentColor: '#E8E4DA',
      accentColorRgb: '232, 228, 218',
      secondaryAccentColor: '#95928A',
    },
  },
  eclipse: {
    label: 'Eclipse',
    subtitle: 'The data is the corona',
    component: EclipseThemeComponent,
    accents: {
      accentColor: '#FFF2D9',
      accentColorRgb: '255, 242, 217',
      secondaryAccentColor: '#94908A',
    },
  },
  telrad: {
    label: 'Telrad',
    subtitle: 'Red-light finder reticle',
    component: TelradThemeComponent,
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
    accents: {
      accentColor: '#FFCF6B',
      accentColorRgb: '255, 207, 107',
      secondaryAccentColor: '#9A92B8',
    },
  },
  comet: {
    label: 'Comet',
    subtitle: 'Exposure data in the tail',
    component: CometThemeComponent,
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
    accents: {
      accentColor: '#2B2316',
      accentColorRgb: '43, 35, 22',
      secondaryAccentColor: '#6E5F45',
    },
  },
  'credits-ivory': {
    label: 'Credits Ivory',
    subtitle: 'Light · one-sheet on paper',
    component: CreditsIvoryThemeComponent,
    accents: {
      accentColor: '#1A1622',
      accentColorRgb: '26, 22, 34',
      secondaryAccentColor: '#6A6376',
    },
  },
  daylight: {
    label: 'Daylight',
    subtitle: 'Light · ink share card',
    component: DaylightThemeComponent,
    accents: {
      accentColor: '#D6187B',
      accentColorRgb: '214, 24, 123',
      secondaryAccentColor: '#10141F',
    },
  },
  headline: {
    label: 'Headline',
    subtitle: 'The wow-stat is the design',
    component: HeadlineThemeComponent,
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
    accents: {
      accentColor: '#FF2D95',
      accentColorRgb: '255, 45, 149',
      secondaryAccentColor: '#8B92A6',
    },
  },
  'film-edge': {
    label: 'Film Edge',
    subtitle: 'A frame of astro film',
    component: FilmEdgeThemeComponent,
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
    accents: {
      accentColor: '#7FE3FF',
      accentColorRgb: '127, 227, 255',
      secondaryAccentColor: '#E8A451',
    },
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

/** Builds the `SelectItem[]` list for the Layout panel's theme picker. */
export function buildCardThemeSelectItems(): readonly SelectItem[] {
  return Object.entries(CARD_THEMES).map(([value, def]) => ({
    value,
    label: def.label,
  }));
}
