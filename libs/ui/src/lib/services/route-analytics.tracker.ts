import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
  afterNextRender,
  inject,
  provideEnvironmentInitializer,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Title } from "@angular/platform-browser";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { AnalyticsService } from "./analytics.service";

/**
 * Browser-side tracker that subscribes to Angular router NavigationEnd events
 * and forwards each one to {@link AnalyticsService.trackPageView} so single-page
 * apps report SPA route changes to GA4.
 *
 * SSR-safe: the router subscription and `document` access are deferred until
 * {@link afterNextRender}, which only fires in the browser, so the tracker is a
 * no-op on the server. To prevent double-counting the first page view, each
 * app's gtag config must set `send_page_view: false` in index.html — this
 * tracker is the sole source of page_view events.
 */
@Injectable({ providedIn: "root" })
export class RouteAnalyticsTracker {
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  // DestroyRef captured at field level (injection context) so it can be
  // passed into takeUntilDestroyed() inside the afterNextRender callback,
  // which runs outside the injection context.
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.router.events
        .pipe(
          filter(
            (event): event is NavigationEnd => event instanceof NavigationEnd,
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          const pageLocation = this.document.defaultView?.location.href ?? "";
          this.analytics.trackPageView(pageLocation, this.title.getTitle());
        });
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
