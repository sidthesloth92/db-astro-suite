import { InjectionToken } from "@angular/core";

/**
 * Abstract analytics service defining the contract for tracking user events.
 * Implement this class and provide it via `ANALYTICS_SERVICE_TOKEN` to swap
 * analytics backends (GA4, Mixpanel, etc.) without changing consumers.
 */
export abstract class AnalyticsService {
  /**
   * Track a custom analytics event.
   * @param eventName The name of the event (e.g., 'image_generation', 'video_export')
   * @param params Optional event parameters (dimensions and metrics)
   */
  abstract trackEvent(eventName: string, params?: Record<string, any>): void;

  /**
   * Track image generation in Astrogram.
   * @param userId Unique identifier for the user (can be anonymized)
   * @param toolsUsed Comma-separated list of tools/features used
   */
  abstract trackImageGeneration(userId: string, toolsUsed: string): void;

  /**
   * Track video generation in Starwizz.
   * @param userId Unique identifier for the user (can be anonymized)
   * @param format Video format/codec used
   */
  abstract trackVideoGeneration(userId: string, format: string): void;
}

/**
 * Injection token for `AnalyticsService`.
 * Provide with `useClass: GoogleAnalyticsService` (or another implementation) in `app.config.ts`.
 */
export const ANALYTICS_SERVICE_TOKEN = new InjectionToken<AnalyticsService>(
  "AnalyticsService",
);
