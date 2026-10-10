/** The standard response envelope every Celestory API route returns. */
export interface ApiResponse<TDetails = Record<string, unknown>> {
  /** Stable machine-readable code (e.g. "STORY_CREATED"). */
  code: string;
  /** Human-readable message safe to surface to users. */
  message: string;
  /** Structured payload; route-specific. */
  details: TDetails;
}
