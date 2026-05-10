/**
 * Core analytics abstraction for tracking custom events.
 * Consumers depend on this abstraction; concrete implementations (e.g., GA4) are provided at the app level.
 */
export abstract class AnalyticsTracker {
  /**
   * Track a custom analytics event.
   * @param name The event name in snake_case (e.g., 'image_generation')
   * @param params Optional event parameters
   */
  abstract trackEvent(name: string, params?: Record<string, unknown>): void;
}
