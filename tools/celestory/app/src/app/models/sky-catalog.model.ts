/** One constellation's figure + naming, as built into `public/sky/sky-catalog.json`. */
export interface SkyConstellation {
  /** IAU three-letter abbreviation. */
  id: string;
  /** Latin name. */
  name: string;
  /** Genitive form. */
  gen: string;
  /** Label anchor [RA°, Dec°]. */
  centre: [number, number];
  /** Stick-figure polylines as [RA°, Dec°] points. */
  lines: [number, number][][];
}

/** A star that carries a proper name or a bright Bayer designation (for labels). */
export interface NamedStar {
  hip: number;
  /** Proper name ('' when only a Bayer designation exists). */
  name: string;
  /** Bayer letter (Greek), '' when none. */
  bayer: string;
  /** Constellation abbreviation. */
  con: string;
  ra: number;
  dec: number;
  mag: number;
}

/** The built sky catalogue JSON. */
export interface SkyCatalog {
  constellations: SkyConstellation[];
  stars: NamedStar[];
}
