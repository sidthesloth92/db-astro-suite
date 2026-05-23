import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsService,
  CardComponent,
  FooterComponent,
  IconComponent,
  StarryBackgroundComponent,
  TextButtonComponent,
  chevronLeftIcon,
  chevronRightIcon,
} from '@db-astro-suite/ui';
import { ASTROGRAM_LAUNCH_URL } from './dossier.constants';

/**
 * Astrogram dossier page — restyled to the Direction B Polished theme.
 * Layout preserved; bespoke chrome (back link arrow, launch button) now
 * uses the shared libs/ui primitives.
 */
@Component({
  selector: 'dba-hub-astrogram-dossier',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    FooterComponent,
    StarryBackgroundComponent,
    TextButtonComponent,
    IconComponent,
  ],
  templateUrl: './astrogram.page.html',
  styleUrl: './astrogram.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AstroGramPage {
  /** Public launch target — bound from the template as the anchor `href`. */
  protected readonly launchUrl = ASTROGRAM_LAUNCH_URL;

  /** Chevron-left glyph used inside the "RETURN TO HUB" back link. */
  protected readonly chevronLeftIcon = chevronLeftIcon;
  /** Chevron-right glyph used as the trailing icon on the Launch Tool CTA. */
  protected readonly chevronRightIcon = chevronRightIcon;

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() =>
      this.upsertCanonical('https://dbastrosuite.com/dossier/astrogram'),
    );
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('astrogram', ASTROGRAM_LAUNCH_URL);
  }

  /** Ensures a `<link rel="canonical">` exists pointing at the supplied URL. */
  private upsertCanonical(href: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

export const routeMeta: RouteMeta = {
  title: 'Astrogram Dossier - Professional Exposure Cards',
  meta: [
    {
      name: 'description',
      content:
        'Astrogram generates sleek, professional Instagram-ready graphics and captions for your astrophotography session metadata.',
    },
    {
      property: 'og:title',
      content: 'Astrogram Dossier - Professional Exposure Cards',
    },
    {
      property: 'og:description',
      content:
        'Astrogram generates sleek, professional Instagram-ready graphics and captions for your astrophotography session metadata.',
    },
    {
      property: 'og:image',
      content: 'https://dbastrosuite.com/astrogram/assets/img/og-astrogram.png',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/dossier/astrogram',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Astrogram Dossier - Professional Exposure Cards',
    },
    {
      name: 'twitter:description',
      content:
        'Astrogram generates sleek, professional Instagram-ready graphics and captions for your astrophotography session metadata.',
    },
    {
      name: 'twitter:image',
      content: 'https://dbastrosuite.com/astrogram/assets/img/og-astrogram.png',
    },
  ],
};
