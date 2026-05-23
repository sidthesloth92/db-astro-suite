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
import { STARWIZZ_LAUNCH_URL } from './dossier.constants';

/**
 * Starwizz dossier page — restyled to the Direction B Polished theme.
 * Layout preserved; bespoke chrome (back link arrow, launch button) now
 * uses the shared libs/ui primitives.
 */
@Component({
  selector: 'dba-hub-starwizz-dossier',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    FooterComponent,
    StarryBackgroundComponent,
    TextButtonComponent,
    IconComponent,
  ],
  templateUrl: './starwizz.page.html',
  styleUrl: './starwizz.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StarwizzPage {
  /** Public launch target — bound from the template as the anchor `href`. */
  protected readonly launchUrl = STARWIZZ_LAUNCH_URL;

  /** Chevron-left glyph used inside the "RETURN TO HUB" back link. */
  protected readonly chevronLeftIcon = chevronLeftIcon;
  /** Chevron-right glyph used as the trailing icon on the Launch Tool CTA. */
  protected readonly chevronRightIcon = chevronRightIcon;

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() =>
      this.upsertCanonical('https://dbastrosuite.com/dossier/starwizz'),
    );
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('starwizz', STARWIZZ_LAUNCH_URL);
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
  title: 'Starwizz - Cinematic Starfield Generator',
  meta: [
    {
      name: 'description',
      content:
        'Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required.',
    },
    {
      property: 'og:title',
      content: 'Starwizz - Cinematic Starfield Generator',
    },
    {
      property: 'og:description',
      content:
        'Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required.',
    },
    {
      property: 'og:image',
      content: 'https://dbastrosuite.com/starwizz/assets/img/preview.png',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/dossier/starwizz',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Starwizz - Cinematic Starfield Generator',
    },
    {
      name: 'twitter:description',
      content:
        'Starwizz is a high-fidelity browser-based tool for creating immersive 4K starfield animations and cinematic space backgrounds — no install required.',
    },
    {
      name: 'twitter:image',
      content: 'https://dbastrosuite.com/starwizz/assets/img/preview.png',
    },
  ],
};
