import { RouteMeta } from '@analogjs/router';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
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
import { LiveStarfieldComponent } from '../components/live-starfield/live-starfield.component';
import { IntroStateService } from '../services/intro-state.service';
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
    LiveStarfieldComponent,
  ],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Suppresses the staged-entrance CSS when this page is constructed on a
    // Back return (the intro already played this session) — see
    // `introAlreadyPlayed` for why this is a construction-time snapshot.
    '[class.intro-done]': 'introAlreadyPlayed',
  },
})
export default class HomePageComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly introState = inject(IntroStateService);

  /**
   * Snapshot — taken when this page instance is constructed — of whether the
   * intro had already played earlier this session. Captured once (not read live
   * from the signal) so that recording the first intro as done mid-animation
   * (see `onLogoAnimationDone`) cannot retroactively suppress this instance's
   * own staged entrance; only later (Back) constructions read it as `true`.
   */
  protected readonly introAlreadyPlayed = this.introState.hasIntroPlayed();

  /** CPU glyph used as the Sortronomy CLI card icon. */
  protected readonly cpuIcon = cpuIcon;

  /** App version shown in the hero status pill (mirrors the footer). */
  protected readonly version = packageJson.version;

  /**
   * Whether the crescent-logo drift-in intro should play. Suppressed on a Back
   * return once the intro has already played this session.
   */
  protected readonly shouldAnimateIntro = !this.introAlreadyPlayed;

  /**
   * Whether the black-hole background loader is shown. On the first visit it is
   * held back until the crescent logo intro settles so the two animations play
   * in sequence (logo first, then background); on a Back return the intro is
   * skipped, so it starts visible.
   */
  protected readonly showBackground = signal(this.introAlreadyPlayed);

  /** Fires the hub tool card click analytics event. */
  onCardClick(tool: HubTool): void {
    this.analytics.trackHubToolCardClicked(tool, 'card');
  }

  /** Reveals the background animation once the logo intro has finished. */
  onLogoAnimationDone(): void {
    this.introState.markIntroPlayed();
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
