import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CelestoryWordmarkComponent } from '../celestory-wordmark/celestory-wordmark.component';
import {
  ASTROGRAM_URL,
  ASTROSPIKE_URL,
  CELESTORY_DOCS_URL,
  GITHUB_URL,
  HUB_URL,
  INSTAGRAM_URL,
  SORTRONOMY_URL,
  STARWIZZ_URL,
} from '../../models/landing.constants';
import type { SiteFooterVariant } from '../../models/site-footer.types';
import { AnalyticsConsentStore } from '../../services/analytics-consent-store.service';
import { reportProfileSubject } from '../../utils/report-profile.util';

/**
 * The shared site footer. `full` is the multi-column footer (brand, Celestory,
 * DB Astro Suite, Help & legal, bottom bar); `compact` is one quiet row for
 * journey pages (profile, preview), with "Report this profile" when a
 * `reportHandle` is given. "Analytics settings" reopens the consent card.
 */
@Component({
  selector: 'dba-site-footer',
  standalone: true,
  imports: [RouterLink, CelestoryWordmarkComponent],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  private readonly consent = inject(AnalyticsConsentStore);

  /** Which layout to render. */
  readonly variant = input<SiteFooterVariant>('full');
  /** On a public profile: the handle the "Report this profile" link refers to ('' hides it). */
  readonly reportHandle = input('');

  /** Query params for the contact page when reporting this profile. */
  protected readonly reportQuery = computed(() => ({ subject: reportProfileSubject(this.reportHandle()) }));

  protected readonly year = new Date().getFullYear();
  protected readonly astrogramUrl = ASTROGRAM_URL;
  protected readonly starwizzUrl = STARWIZZ_URL;
  protected readonly astrospikeUrl = ASTROSPIKE_URL;
  protected readonly sortronomyUrl = SORTRONOMY_URL;
  protected readonly hubUrl = HUB_URL;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly docsUrl = CELESTORY_DOCS_URL;
  protected readonly instagramUrl = INSTAGRAM_URL;

  /** Reopen the analytics consent card. */
  openAnalyticsSettings(): void {
    this.consent.reopen();
  }
}
