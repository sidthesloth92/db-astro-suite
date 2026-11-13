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
  SHARE_PROMPT_CONFIG,
  STORAGE_SERVICE_TOKEN,
  provideRouteAnalytics,
} from '@db-astro-suite/ui';

import { routes } from './app.routes';
import { STARWIZZ_SHARE_PROMPT_CONFIG } from './constants/share-prompt.constant';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    { provide: SHARE_PROMPT_CONFIG, useValue: STARWIZZ_SHARE_PROMPT_CONFIG },
    provideRouteAnalytics(),
  ],
};
