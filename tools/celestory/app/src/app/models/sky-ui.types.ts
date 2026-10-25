/** Result of choosing the opening instant for the planetarium. */
export interface DarkSkyChoice {
  /** The instant to show. */
  time: Date;
  /** True when it differs from the current time. */
  moved: boolean;
  /** Why it moved: after dusk, after moonset, the darkest moment of a bright night, or not at all. */
  reason: 'now' | 'dusk' | 'moonset' | 'midnight';
}
