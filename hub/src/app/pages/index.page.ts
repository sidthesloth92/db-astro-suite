import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsService,
  CardComponent,
  ChevronRightIconComponent,
  FooterComponent,
  PillBadgeComponent,
  StarryBackgroundComponent,
  TextButtonComponent,
} from '@db-astro-suite/ui';
import type { HubTool } from './hub-tool.types';

/**
 * Hub home page — restyled to the Direction B Polished theme.
 * Layout is preserved; bespoke status pills / launch CTAs are replaced
 * by the libs/ui primitives (`PillBadge`, `TextButton`) so hub reads
 * as a sibling of the astrogram chrome.
 */
@Component({
  selector: 'dba-hub-home-page',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    FooterComponent,
    StarryBackgroundComponent,
    PillBadgeComponent,
    TextButtonComponent,
    ChevronRightIconComponent,
  ],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent {
  private readonly analytics = inject(AnalyticsService);

  /** Fires the hub tool card click analytics event. */
  onCardClick(tool: HubTool): void {
    this.analytics.trackHubToolCardClicked(tool, 'card');
  }

  /**
   * Fires the hub "learn more" link analytics event. The `event` is used
   * to stop propagation so the parent mission-card's click handler /
   * `[routerLink]` does not fire as well (otherwise we double-track the
   * card click + double-trigger navigation).
   */
  onLearnMoreClick(event: Event, tool: HubTool): void {
    event.stopPropagation();
    this.analytics.trackHubToolCardClicked(tool, 'learn_more');
  }
}

export const routeMeta: RouteMeta = {
  title: 'DB Astro Suite - Professional Astrophotography Tools',
  meta: [
    {
      name: 'description',
      content:
        'A professional collection of social-media focused astrophotography tools. Transform captures into cinematic starfield animations or professional Instagram exposure cards.',
    },
    {
      property: 'og:title',
      content: 'DB Astro Suite - From Sensor to Social',
    },
    {
      property: 'og:description',
      content:
        'A professional collection of social-media focused astrophotography tools built to get your space photos off your hard drive and onto social media',
    },
  ],
};
