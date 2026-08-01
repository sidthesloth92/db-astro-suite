import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { ASTROSPIKE_DETAIL } from './astrospike-detail.constants';
import { ASTROSPIKE_LAUNCH_URL } from './tool.constants';

/**
 * AstroSpike tool page — built on the shared `ToolDetailComponent`. Provides
 * the brand mark plus before/after preview stills via content projection.
 */
@Component({
  selector: 'dba-hub-astrospike-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent],
  templateUrl: './astrospike.page.html',
  styleUrl: './astrospike.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AstrospikePage {
  /** Content driving the shared detail layout. */
  protected readonly config = ASTROSPIKE_DETAIL;

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/tool/astrospike');
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('astrospike', ASTROSPIKE_LAUNCH_URL);
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
  title: 'AstroSpike - Add Diffraction Spikes to Astrophotos',
  meta: [
    {
      name: 'description',
      content:
        'AstroSpike adds Newtonian and JWST-style diffraction spikes to your astrophotos in the browser. Stars are detected automatically and nothing is ever uploaded.',
    },
    {
      property: 'og:title',
      content: 'AstroSpike - Add Diffraction Spikes to Astrophotos',
    },
    {
      property: 'og:description',
      content:
        'AstroSpike adds Newtonian and JWST-style diffraction spikes to your astrophotos in the browser. Stars are detected automatically and nothing is ever uploaded.',
    },
    {
      property: 'og:image',
      content: 'https://dbastrosuite.com/astrospike/assets/img/astrospike-og.jpg',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/tool/astrospike',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'AstroSpike - Add Diffraction Spikes to Astrophotos',
    },
    {
      name: 'twitter:description',
      content:
        'AstroSpike adds Newtonian and JWST-style diffraction spikes to your astrophotos in the browser. Stars are detected automatically and nothing is ever uploaded.',
    },
    {
      name: 'twitter:image',
      content: 'https://dbastrosuite.com/astrospike/assets/img/astrospike-og.jpg',
    },
  ],
};
