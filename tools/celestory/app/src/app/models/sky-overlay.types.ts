import type { SkyCatalog } from './sky-catalog.model';
import type { SkyLocation, SkyTarget } from './sky.types';

/** Overlay toggles the user controls. */
export interface SkyOverlayToggles {
  /** Alt/az graticule + celestial equator / ecliptic / meridian. */
  grid: boolean;
  /** Constellation figures + names. */
  constellations: boolean;
  /** Star names. */
  labels: boolean;
  /** Deep-sky survey imagery when zoomed in. */
  survey: boolean;
}

/** Live state the overlay renderer reads each frame, provided by the host component. */
export interface SkyOverlayState {
  /** Current observer location. */
  location: () => SkyLocation;
  /** The simulated instant to draw for. */
  now: () => Date;
  /** Overlay toggles. */
  toggles: () => SkyOverlayToggles;
  /** Light pollution level 0..1. */
  lightPollution: () => number;
  /** Constellation / star-name catalogue once loaded. */
  catalog: () => SkyCatalog | null;
  /** User targets to plot (with current alt/az). */
  targets: () => SkyTarget[];
  /** The DOM marker elements, index-aligned to targets. */
  markerEls: () => (HTMLElement | null)[];
}

/** Everything computed once per frame and shared by overlay drawing + marker placement. */
export interface SkyOverlayFrame {
  width: number;
  height: number;
  fovDeg: number;
}
