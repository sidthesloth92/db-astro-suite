import { InjectionToken } from '@angular/core';
import { AnalyticsTracker } from './analytics-tracker.abstract';

/**
 * Injection token for `AnalyticsTracker`.
 * 
 * Provide with `useClass: GoogleAnalyticsTrackerService` (or another implementation) in `app.config.ts`.
 * 
 * Example:
 * ```typescript
 * import { ANALYTICS_TRACKER_TOKEN, GoogleAnalyticsTrackerService } from '@db-astro-suite/ui';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     { provide: ANALYTICS_TRACKER_TOKEN, useClass: GoogleAnalyticsTrackerService },
 *   ]
 * };
 * ```
 */
export const ANALYTICS_TRACKER_TOKEN = new InjectionToken<AnalyticsTracker>('AnalyticsTracker');
