import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';
import { CONTACT_EMAIL } from '../models/contact.constants';
import { AnalyticsConsentStore } from '../services/analytics-consent-store.service';

/** Privacy page: what Celestory collects, why, and the visitor's choices. */
export const routeMeta: RouteMeta = {
  title: 'Celestory · Privacy',
  meta: [
    {
      name: 'description',
      content: 'What Celestory collects, why, and how to delete your data or change your analytics choice.',
    },
  ],
};

/**
 * Plain-language privacy page. Kept short on purpose: what the CLI does, what
 * the site records, what publishing makes public, analytics, browser storage,
 * hosting, and how to delete or report. Includes an "Analytics settings"
 * button that reopens the consent card.
 */
@Component({
  selector: 'dba-celestory-privacy',
  standalone: true,
  imports: [RouterLink, ConstellationFieldComponent, CelestoryWordmarkComponent, SiteFooterComponent],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyPageComponent {
  private readonly consent = inject(AnalyticsConsentStore);

  /** Where privacy questions and removal requests go. */
  protected readonly contactEmail = CONTACT_EMAIL;

  /** Reopen the analytics consent card. */
  openAnalyticsSettings(): void {
    this.consent.reopen();
  }
}
