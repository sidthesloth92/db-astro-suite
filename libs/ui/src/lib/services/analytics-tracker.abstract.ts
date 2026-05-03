/**
 * Abstract contract for analytics event tracking.
 * Implementations should handle platform-specific tracking (e.g., GA4, Mixpanel).
 *
 * Dependency Inversion: Components and services depend on this abstraction,
 * not on concrete implementations like GoogleAnalyticsTracker.
 */
export abstract class AnalyticsTracker {
  /**
   * Track a successful image generation event.
   *
   * @param userId - The unique identifier of the user who generated the image
   * @param toolsUsed - Comma-separated string of tools/models used (e.g., "astrosolve, wcs-projection")
   */
  abstract trackImageGeneration(userId: string, toolsUsed: string): void;

  /**
   * Track a successful video generation event.
   *
   * @param userId - The unique identifier of the user who generated the video
   * @param format - The format of the generated video (e.g., "mp4", "webm", or aspect ratio like "9:16")
   */
  abstract trackVideoGeneration(userId: string, format: string): void;
}
