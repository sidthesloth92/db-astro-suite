import { RouteMeta } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { setSsrStatus } from '../utils/ssr-status.util';

/** Any unmatched URL: a clear "not found" page, never indexed. */
export const routeMeta: RouteMeta = {
  title: 'Celestory · Page not found',
  meta: [{ name: 'robots', content: 'noindex' }],
};

/**
 * Catch-all for URLs that match no page. Renders a "page not found" message
 * with a way home and answers HTTP 404 during SSR, instead of an empty app
 * shell with 200. Shares the profile page's "missing" styles.
 */
@Component({
  selector: 'dba-celestory-not-found',
  standalone: true,
  imports: [RouterLink, ConstellationFieldComponent, CelestoryWordmarkComponent],
  templateUrl: './[...not-found].page.html',
  styleUrl: './user/[handle].page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundPageComponent implements OnInit {
  /** The server response during SSR (null in the browser) — carries the 404. */
  private readonly response = injectResponse();

  /** Answer 404 for the server-rendered page. */
  ngOnInit(): void {
    setSsrStatus(this.response, 404);
  }
}
