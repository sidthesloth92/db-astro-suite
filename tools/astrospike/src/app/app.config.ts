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
  provideRouteAnalytics,
} from '@db-astro-suite/ui';
import { routes } from './app.routes';
import { SpikeEditorService } from './services/spike-editor.service';

/** Application-wide providers for the AstroSpike root injector. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    provideRouteAnalytics(),
    // Fire-and-forget (no returned promise): bootstrap must not wait on a
    // sample download — the studio renders and the image arrives when it does.
    provideAppInitializer(() => {
      void inject(SpikeEditorService).loadSampleImage();
    }),
  ],
};
