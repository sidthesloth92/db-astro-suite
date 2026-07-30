import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AnalyticsService,
  GoogleAnalyticsService,
  LocalStorageService,
  STORAGE_SERVICE_TOKEN,
  provideRouteAnalytics,
} from '@db-astro-suite/ui';
import { routes } from './app.routes';

/** Application-wide providers for the AstroSpike root injector. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    // Remembers the "don't show this again" choice on the how-to overlay.
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    provideRouteAnalytics(),
  ],
};
