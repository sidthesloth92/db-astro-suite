import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  ANALYTICS_SERVICE_TOKEN,
  GoogleAnalyticsService,
  LocalStorageService,
  STORAGE_SERVICE_TOKEN,
} from '@db-astro-suite/ui';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    { provide: ANALYTICS_SERVICE_TOKEN, useClass: GoogleAnalyticsService },
  ],
};
