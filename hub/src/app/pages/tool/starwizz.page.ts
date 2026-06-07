import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { StarwizzMarkComponent } from '../../components/starwizz-mark/starwizz-mark.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { STARWIZZ_DETAIL } from './starwizz-detail.constants';
import { STARWIZZ_LAUNCH_URL } from './tool.constants';

/**
 * Starwizz tool page — premium redesign on the shared `ToolDetailComponent`.
 * Provides the brand mark + starfield demo media via content projection and
 * keeps a click-to-expand lightbox for the output animation.
 */
@Component({
  selector: 'dba-hub-starwizz-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent, StarwizzMarkComponent],
  templateUrl: './starwizz.page.html',
  styleUrl: './starwizz.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StarwizzPage {
  /** Content driving the shared detail layout. */
  protected readonly config = STARWIZZ_DETAIL;

  /** Whether the demo lightbox is currently open. */
  protected readonly isLightboxOpen = signal(false);

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() =>
      this.upsertCanonical('https://dbastrosuite.com/tool/starwizz'),
    );
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('starwizz', STARWIZZ_LAUNCH_URL);
  }

  /** Opens the demo lightbox and locks body scroll. */
  openLightbox(): void {
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
      content: 'https://dbastrosuite.com/tool/starwizz',
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
