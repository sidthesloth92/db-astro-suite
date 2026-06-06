import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { ASTROGRAM_DETAIL } from './astrogram-detail.constants';
import { ASTROGRAM_LAUNCH_URL } from './tool.constants';

/**
 * Astrogram tool page — premium redesign on the shared `ToolDetailComponent`.
 * Provides the brand mark + demo media via content projection and keeps a
 * click-to-expand lightbox for the plate-solved and exposure-card outputs.
 */
@Component({
  selector: 'dba-hub-astrogram-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent],
  templateUrl: './astrogram.page.html',
  styleUrl: './astrogram.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AstroGramPage {
  /** Content driving the shared detail layout. */
  protected readonly config = ASTROGRAM_DETAIL;

  /** Whether the demo lightbox is currently open. */
  protected readonly isLightboxOpen = signal(false);

  /** Source of the image currently shown in the lightbox. */
  protected readonly lightboxSrc = signal('');

  /** Alt text for the image currently shown in the lightbox. */
  protected readonly lightboxAlt = signal('');

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/tool/astrogram');
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('astrogram', ASTROGRAM_LAUNCH_URL);
  }

  /** Opens the demo lightbox for the given image and locks body scroll. */
  openLightbox(src: string, alt: string): void {
    this.lightboxSrc.set(src);
    this.lightboxAlt.set(alt);
    this.isLightboxOpen.set(true);
    this.document.body.style.overflow = 'hidden';
  }

  /** Closes the demo lightbox and restores body scroll. */
  closeLightbox(): void {
    this.isLightboxOpen.set(false);
    this.document.body.style.overflow = '';
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
  title: 'Astrogram Tool - Professional Exposure Cards',
  meta: [
    {
      name: 'description',
      content:
        'Astrogram generates sleek, professional Instagram-ready graphics and captions for your astrophotography session metadata.',
    },
    {
      property: 'og:title',
      content: 'Astrogram Tool - Professional Exposure Cards',
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
      content: 'https://dbastrosuite.com/tool/astrogram',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Astrogram Tool - Professional Exposure Cards',
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
