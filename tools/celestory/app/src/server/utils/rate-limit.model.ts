/** Shapes for the fixed-window rate limiter. */

/** One fixed-window limit: at most `limit` hits per `windowSeconds`. */
export interface RateRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

/** A named set of rules for one endpoint; every rule must pass. */
export interface RateBucket {
  /** Stable bucket name, used as the counter-key prefix. */
  readonly name: string;
  readonly rules: readonly RateRule[];
}

/** A counted hit that the caller can give back when it turns out it shouldn't count. */
export interface RateReservation {
  /** Undo this hit (best-effort; never throws). */
  refund(): Promise<void>;
}
