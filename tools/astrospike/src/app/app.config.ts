import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
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
import { ASTROSPIKE_SHARE_PROMPT_CONFIG } from './constants/share-prompt.constants';
import { SpikeEditorService } from './services/spike-editor.service';

/** Application-wide providers for the AstroSpike root injector. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    { provide: STORAGE_SERVICE_TOKEN, useClass: LocalStorageService },
    { provide: SHARE_PROMPT_CONFIG, useValue: ASTROSPIKE_SHARE_PROMPT_CONFIG },
    provideRouteAnalytics(),
    // Fire-and-forget (no returned promise): bootstrap must not wait on a
    // sample download — the studio renders and the image arrives when it does.
    provideAppInitializer(() => {
      void inject(SpikeEditorService).loadSampleImage();
    }),
  ],
};
