/**
 * One unit segment of a decomposed duration, e.g. `{ value: 13, unit: 'd' }`.
 * Used by the hero total so each amount can render big with a small unit suffix.
 */
export interface DurationPart {
  /** The numeric amount for this unit. */
  readonly value: number;
  /** Short unit suffix: `'y' | 'mo' | 'd' | 'h' | 'm'`. */
  readonly unit: 'y' | 'mo' | 'd' | 'h' | 'm';
}
