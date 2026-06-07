import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsService,
  BlackHoleLoaderComponent,
  FooterComponent,
  IconComponent,
  StarryBackgroundComponent,
  cpuIcon,
} from '@db-astro-suite/ui';
import { CrescentLogoComponent } from '../components/crescent-logo/crescent-logo.component';
import { AstroMarkComponent } from '../components/astro-mark/astro-mark.component';
import { StarwizzMarkComponent } from '../components/starwizz-mark/starwizz-mark.component';
import { LiveStarfieldComponent } from '../components/live-starfield/live-starfield.component';
import packageJson from '../../../../package.json';
import type { HubTool } from './hub-tool.types';

/**
 * Hub home page — premium "DB Astro Suite" landing redesign.
 * Leads with the animated crescent + ASTROSUITE wordmark lockup, then a
 * restrained 3-up tool-card grid. The starry background + black-hole loader
 * animation is preserved; colour earns its place (pink/cyan only on the
 * wordmark, status dots, and accents).
 */
@Component({
  selector: 'dba-hub-home-page',
  standalone: true,
  imports: [
    RouterLink,
    BlackHoleLoaderComponent,
    FooterComponent,
    StarryBackgroundComponent,
    IconComponent,
    CrescentLogoComponent,
    AstroMarkComponent,
    StarwizzMarkComponent,
    LiveStarfieldComponent,
  ],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent {
  private readonly analytics = inject(AnalyticsService);

  /** CPU glyph used as the Sortronomy CLI card icon. */
  protected readonly cpuIcon = cpuIcon;

  /** App version shown in the hero status pill (mirrors the footer). */
  protected readonly version = packageJson.version;

  /**
   * Whether the black-hole background loader is shown. Held back until the
   * crescent logo intro animation has settled so the two animations play in
   * sequence (logo first, then background).
   */
  protected readonly showBackground = signal(false);

  /** Fires the hub tool card click analytics event. */
  onCardClick(tool: HubTool): void {
    this.analytics.trackHubToolCardClicked(tool, 'card');
  }

  /** Reveals the background animation once the logo intro has finished. */
  onLogoAnimationDone(): void {
    this.showBackground.set(true);
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
