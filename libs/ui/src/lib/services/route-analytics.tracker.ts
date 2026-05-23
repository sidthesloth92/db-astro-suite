import { DOCUMENT } from "@angular/common";
import {
  EnvironmentProviders,
  Injectable,
  inject,
  provideEnvironmentInitializer,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Title } from "@angular/platform-browser";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { AnalyticsService } from "./analytics.service";

/**
 * Subscribes to Angular router NavigationEnd events and forwards each one to
 * {@link AnalyticsService.trackPageView} so single-page apps report SPA route
 * changes to GA4. To prevent double-counting the first page view, each app's
 * gtag config must set `send_page_view: false` in index.html — this tracker is
 * the sole source of page_view events.
 */
@Injectable({ providedIn: "root" })
export class RouteAnalyticsTracker {
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const pageLocation = this.document.defaultView?.location.href ?? "";
        this.analytics.trackPageView(pageLocation, this.title.getTitle());
      });
  }
}

/**
 * Provider that eagerly instantiates {@link RouteAnalyticsTracker} during
 * application initialization so it begins listening to router events
 * immediately. Add to the `providers` array in each app's `app.config.ts`.
 */
export function provideRouteAnalytics(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => inject(RouteAnalyticsTracker));
}
