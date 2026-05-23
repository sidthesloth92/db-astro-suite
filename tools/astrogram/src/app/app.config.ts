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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    provideRouteAnalytics(),
  ],
};
