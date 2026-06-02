import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { withInMemoryScrolling } from '@angular/router';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import {
  AnalyticsService,
  GoogleAnalyticsService,
  provideRouteAnalytics,
} from '@db-astro-suite/ui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Scroll to the top on forward navigation (e.g. hub card → tool page) and
    // restore the previous position on back/forward.
    provideFileRouter(
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor])
    ),
    provideClientHydration(withEventReplay()),
    { provide: AnalyticsService, useClass: GoogleAnalyticsService },
    provideRouteAnalytics(),
  ],
};
