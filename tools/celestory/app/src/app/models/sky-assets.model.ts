import type { PackedStarCatalog } from './star-catalog.model';
import type { SkyCatalog } from './sky-catalog.model';

/** The assets needed to draw the first frame. */
export interface SkyCoreAssets {
  /** Hipparcos, sorted by magnitude. */
  stars: PackedStarCatalog;
  /** Constellation figures + named stars. */
  catalog: SkyCatalog;
  /** Milky Way equirect map (4k; the 8k map streams in afterwards on capable devices). */
  milkyWay: ImageBitmap;
}

/** Options for the Milky Way texture fetch. */
export interface MilkyWayLoadOptions {
  /** Request the 8k map (desktop-class GPU). */
  highRes: boolean;
}
