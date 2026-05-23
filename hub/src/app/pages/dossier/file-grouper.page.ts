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
import { FILE_GROUPER_REPO_URL } from './dossier.constants';

/**
 * File Grouper dossier page — restyled to the Direction B Polished theme.
 * Layout preserved; bespoke chrome (back link arrow, access-repository
 * button) now uses the shared libs/ui primitives.
 */
@Component({
  selector: 'dba-hub-file-grouper-dossier',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    FooterComponent,
    StarryBackgroundComponent,
    TextButtonComponent,
    IconComponent,
  ],
  templateUrl: './file-grouper.page.html',
  styleUrl: './file-grouper.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FileGrouperPageComponent {
  /** External GitHub repo URL — bound from the template as the anchor `href`. */
  protected readonly repoUrl = FILE_GROUPER_REPO_URL;

  /** Chevron-left glyph used inside the "RETURN TO HUB" back link. */
  protected readonly chevronLeftIcon = chevronLeftIcon;
  /** Chevron-right glyph used as the trailing icon on the Access Repository CTA. */
  protected readonly chevronRightIcon = chevronRightIcon;

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() =>
      this.upsertCanonical('https://dbastrosuite.com/dossier/file-grouper'),
    );
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('file-grouper', FILE_GROUPER_REPO_URL);
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
  title: 'File Grouper Dossier - Dataset Organization Utility',
  meta: [
    {
      name: 'description',
      content:
        'A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object.',
    },
    {
      property: 'og:title',
      content: 'File Grouper - Organize Your Space Data',
    },
    {
      property: 'og:description',
      content:
        'Automate the tedious task of sorting thousands of frames into a logical hierarchy for cleaner processing.',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/dossier/file-grouper',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'File Grouper - Organize Your Space Data',
    },
    {
      name: 'twitter:description',
      content:
        'A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object.',
    },
  ],
};
