import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
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
import { ASTROGRAM_SHARE_PROMPT_CONFIG } from './constants/share-prompt.constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch()),
    provideRouter(routes),
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    { provide: SHARE_PROMPT_CONFIG, useValue: ASTROGRAM_SHARE_PROMPT_CONFIG },
    provideRouteAnalytics(),
  ],
};
