/** An object name split for a two-tier hero: a large proper name over a smaller descriptor. */
export interface HeroNameParts {
  /** The proper name, set large ("Rosette", "North America"). */
  readonly primary: string;
  /** The descriptor that follows it ("Nebula", "Nebula Complex"); empty when there is none. */
  readonly rest: string;
}
