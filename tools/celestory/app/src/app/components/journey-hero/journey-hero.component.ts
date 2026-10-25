import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { BRAND_CYAN, BRAND_PINK } from '../../models/brand.constants';
import type { JourneyState } from '../../models/journey.types';
import type { CelestoryStory } from '../../models/story.model';
import type { HeatStripView, Highlight, YearSpan } from '../../models/portfolio-view.types';
import { SessionStore } from '../../services/session-store.service';
import { targetRaDec } from '../../utils/celestial.util';
import { formatCount, formatDuration } from '../../utils/format.util';
import { heatStrip, highlights, seasonCount, yearSpan } from '../../utils/portfolio.util';
import { displayIdentity } from '../../utils/display-identity.util';
import { TextButtonComponent } from '@db-astro-suite/ui';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { CelestoryWordmarkComponent } from '../celestory-wordmark/celestory-wordmark.component';
import { FilterDistributionComponent } from '../filter-distribution/filter-distribution.component';
import { HeatStripComponent } from '../heat-strip/heat-strip.component';
import { MoonPhaseTimelineComponent } from '../moon-phase-timeline/moon-phase-timeline.component';
import { SectionBannerComponent } from '../section-banner/section-banner.component';
import { UniverseGlobeComponent } from '../universe-globe/universe-globe.component';

let heroUid = 0;

/**
 * The per-user journey hero (the design's SummaryPage), blended into the
 * background: identity → year-span moon-phase timeline → giant total integration
 * → key metrics → "Highlights of the journey" → filter distribution → nightly
 * activity heat strip. Emits share/publish/open-target intents to the shell.
 * The name follows displayIdentity(): the viewer's own in preview, the
 * profile's saved one elsewhere. Owners edit it via "Edit profile" (publish
 * dialog); in preview it's set in the publish dialog or Share Studio.
 */
@Component({
  selector: 'dba-journey-hero',
  standalone: true,
  imports: [
    TextButtonComponent,
    CelIconComponent,
    CelestoryWordmarkComponent,
    MoonPhaseTimelineComponent,
    FilterDistributionComponent,
    HeatStripComponent,
    SectionBannerComponent,
    UniverseGlobeComponent,
  ],
  templateUrl: './journey-hero.component.html',
  styleUrl: './journey-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyHeroComponent {
  /** The viewer's browser-saved identity (used only in Private Preview). */
  private readonly session = inject(SessionStore);
  /** The story to render. */
  readonly story = input.required<CelestoryStory>();
  /** The public handle (empty in Private Preview). */
  readonly handle = input<string>('');
  /** Current journey state — gates the Publish action and picks whose name is shown. */
  readonly state = input.required<JourneyState>();

  /** Open the unified Share modal. */
  readonly share = output<void>();
  /** Open the Publish flow. */
  readonly publish = output<void>();
  /** Open a target's detail (the top-target highlight). */
  readonly openTarget = output<string>();
  /** Enter the full-screen planetarium ("View My Universe"). */
  readonly enterSky = output<void>();

  /** Avatar gradient/mask ids. */
  protected readonly avG = `hav-g-${heroUid}`;
  protected readonly avM = `hav-m-${heroUid++}`;
  protected readonly cyan = BRAND_CYAN;
  protected readonly pink = BRAND_PINK;

  /** Name and username shown for this page type (see displayIdentity). */
  private readonly shown = computed(() =>
    displayIdentity(this.state(), this.story(), this.handle(), this.session.identity()),
  );
  /** Display name for the "[Name]'s Celestory" lockup. */
  protected readonly displayName = computed(() => this.shown().name);
  /** Bare username (no leading "@"); the template renders the "@" so we never double it. */
  protected readonly displayUsername = computed(() => this.shown().username.replace(/^@+/, ''));
  /** Possessive prefix for the "[Name]'s Celestory" lockup. */
  protected readonly lockupPrefix = computed(() => `${this.displayName()}'s`);
  /** Tagline that follows the effective (possibly edited) author name, not the static story name. */
  protected readonly tagline = computed<string>(() => {
    const first = this.displayName().trim().split(/\s+/)[0];
    return first ? `${first}’s journey under the stars` : 'A journey under the stars';
  });

  /** First→latest year span. */
  protected readonly span = computed<YearSpan | null>(() => yearSpan(this.story()));
  /** Inclusive season count. */
  protected readonly seasons = computed<number | null>(() => seasonCount(this.story()));
  /** Hero integration total as one dramatic hours+minutes figure, e.g. "642h 18m". */
  protected readonly heroTime = computed<string>(() =>
    formatDuration(this.story().summary.totalIntegrationSeconds),
  );
  /** Sub line for the "01 · Activity" section banner ("N nights · Xh Ym integrated"). */
  protected readonly activitySub = computed<string>(
    () =>
      `${formatCount(this.story().summary.nightCount)} nights · ` +
      `${formatDuration(this.story().summary.totalIntegrationSeconds)} integrated`,
  );
  /** Highlights of the journey. */
  protected readonly highlights = computed<Highlight[]>(() => highlights(this.story()));
  /** Heat-strip view-model. */
  protected readonly heat = computed<HeatStripView>(() => heatStrip(this.story()));
  /** Whether any imaged target resolves to sky coordinates (gates the universe globe). */
  protected readonly hasSky = computed(() => this.story().targets.some((o) => targetRaDec(o) != null));

  /** Thousands-separated integer for the template. */
  protected count(n: number): string {
    return formatCount(n);
  }
}
