import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AnalyticsService,
  GoogleAnalyticsService,
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
    provideRouteAnalytics(),
  ],
};
