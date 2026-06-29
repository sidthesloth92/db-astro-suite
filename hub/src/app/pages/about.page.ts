import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StarryBackgroundComponent, TextButtonComponent } from '@db-astro-suite/ui';

/**
 * Hub About page — restyled to the Direction B Polished theme. Uses the
 * shared starry background + TextButton primary CTA in place of the
 * previous bespoke chrome.
 */
@Component({
  selector: 'dba-hub-about-page',
  standalone: true,
  imports: [StarryBackgroundComponent, TextButtonComponent],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AboutPageComponent {
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/about');
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
  title: 'About DB Astro Suite - Dinesh Balaji Venkataraj',
  meta: [
    {
      name: 'description',
      content:
        'Learn more about DB Astro Suite, a collection of tools built to solve real astrophotography problems and explore new technologies.',
    },
    {
      property: 'og:title',
      content: 'About DB Astro Suite - Dinesh Balaji Venkataraj',
    },
    {
      property: 'og:description',
      content:
        'Learn more about DB Astro Suite, a collection of tools built to solve real astrophotography problems and explore new technologies.',
    },
    {
      property: 'og:image',
      content: 'https://dbastrosuite.com/assets/img/og-dbastrosuite.png',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/about',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'About DB Astro Suite - Dinesh Balaji Venkataraj',
    },
    {
      name: 'twitter:description',
      content:
        'Learn more about DB Astro Suite, a collection of tools built to solve real astrophotography problems and explore new technologies.',
    },
    {
      name: 'twitter:image',
      content: 'https://dbastrosuite.com/assets/img/og-dbastrosuite.png',
    },
  ],
};
