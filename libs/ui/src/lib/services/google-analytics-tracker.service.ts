import { Injectable } from '@angular/core';
import { AnalyticsTracker } from './analytics-tracker.abstract';

/**
 * Google Analytics 4 (GA4) implementation of AnalyticsTracker.
 *
 * This service safely accesses the global gtag function and sends events to GA4.
 * Handles graceful degradation when gtag is unavailable (e.g., ad-blocker scenarios).
 *
 * Implementation details:
 * - Checks for gtag availability before calling
 * - Logs warnings (not errors) if gtag is unavailable
 * - Wraps all gtag calls in try-catch to prevent tracking failures from breaking the app
 * - Never throws exceptions to caller — always completes gracefully
 */
@Injectable()
export class GoogleAnalyticsTrackerService implements AnalyticsTracker {
  /**
   * Safely get the gtag function from window.
   * Returns undefined if gtag is not available (e.g., due to ad-blocker or gtag script not loaded).
   */
  private getGtag(): ((command: string, action: string, params?: Record<string, unknown>) => void) | undefined {
    // Type-safe check for gtag existence
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const possibleGtag = (window as unknown as { gtag?: unknown }).gtag;
      if (typeof possibleGtag === 'function') {
        return possibleGtag as (command: string, action: string, params?: Record<string, unknown>) => void;
      }
    }
    return undefined;
  }

  trackImageGeneration(userId: string, toolsUsed: string): void {
    this.trackEvent('image_generation', { user_id: userId, tools_used: toolsUsed });
  }

  trackVideoGeneration(userId: string, format: string): void {
    this.trackEvent('video_generation', { user_id: userId, format });
  }

  /**
   * Internal method to safely send an event to GA4.
   *
   * @param eventName - The GA4 event name (snake_case)
   * @param params - Event parameters to send
   */
  private trackEvent(eventName: string, params: Record<string, unknown>): void {
    try {
      const gtag = this.getGtag();

      if (!gtag) {
        // Log a warning but do not throw — gtag may be blocked by ad-blocker or script not loaded
        console.warn(`[AnalyticsTracker] gtag not available; event '${eventName}' not sent.`);
        return;
      }

      gtag('event', eventName, params);
    } catch (error) {
      // Catch any unexpected errors from gtag (e.g., invalid params) and log them
      // Do NOT re-throw — tracking errors must not break the application
      console.error(`[AnalyticsTracker] Failed to send event '${eventName}':`, error);
    }
  }
}
