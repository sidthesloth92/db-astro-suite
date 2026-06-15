import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { BRAND_CYAN, BRAND_PINK } from '../../models/brand.constants';
import type { JourneyState } from '../../models/journey.types';
import type { CelestoryLedger } from '../../models/ledger.model';
import type { HeatStripView, HeroIdentity, Highlight, YearSpan } from '../../models/portfolio-view.types';
import { SessionStore } from '../../services/session-store.service';
import { objectRaDec } from '../../utils/celestial.util';
import { formatCount, formatDuration } from '../../utils/format.util';
import { slugifyHandle } from '../../utils/handle.util';
import {
  heatStrip,
  heroIdentity,
  highlights,
  seasonCount,
  yearSpan,
} from '../../utils/portfolio.util';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
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
 * activity heat strip. Emits share/publish/open-object intents to the shell.
 */
@Component({
  selector: 'dba-journey-hero',
  standalone: true,
  imports: [
    TextButtonComponent,
    IconButtonComponent,
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
  /** Editable identity, persisted + shared with the Share Studio. */
  protected readonly session = inject(SessionStore);
  /** The ledger to render. */
  readonly ledger = input.required<CelestoryLedger>();
  /** The public handle (empty in Private Preview). */
  readonly handle = input<string>('');
  /** Current journey state — gates the Publish action. */
  readonly state = input.required<JourneyState>();

  /** Open the unified Share modal. */
  readonly share = output<void>();
  /** Open the Publish flow. */
  readonly publish = output<void>();
  /** Open an object's detail (the top-target highlight). */
  readonly openObject = output<string>();
  /** Enter the full-screen planetarium ("View My Universe"). */
  readonly enterSky = output<void>();

  /** Avatar gradient/mask ids. */
  protected readonly avG = `hav-g-${heroUid}`;
  protected readonly avM = `hav-m-${heroUid++}`;
  protected readonly cyan = BRAND_CYAN;
  protected readonly pink = BRAND_PINK;

  /** Resolved identity (from the ledger). */
  protected readonly identity = computed<HeroIdentity>(() => heroIdentity(this.ledger(), this.handle()));
  /** Display name/handle — the user's edited identity overrides the ledger's. */
  protected readonly displayName = computed(() => this.session.identity().name || this.identity().name);
  /** Bare handle (no leading "@"); the template renders the "@" so we never double it. */
  protected readonly displayHandle = computed(() =>
    (this.session.identity().handle || this.identity().handle).replace(/^@+/, ''),
  );
  /** Possessive prefix for the "[Name]'s Celestory" lockup. */
  protected readonly lockupPrefix = computed(() => `${this.displayName()}'s`);

  /** Inline identity editor. */
  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editHandle = signal('');

  /** Open the identity editor, prefilled with the current values. */
  startEdit(): void {
    this.editName.set(this.displayName());
    this.editHandle.set(this.displayHandle().replace(/^@/, ''));
    this.editing.set(true);
  }
  /** Persist the edited identity (shared with the Share Studio) and close. */
  saveEdit(): void {
    this.session.setIdentity({ name: this.editName().trim(), handle: slugifyHandle(this.editHandle()) });
    this.editing.set(false);
  }
  /** Discard edits. */
  cancelEdit(): void {
    this.editing.set(false);
  }
  /** Track editor inputs. */
  onEditName(value: string): void {
    this.editName.set(value);
  }
  onEditHandle(value: string): void {
    this.editHandle.set(value);
  }
  /** First→latest year span. */
  protected readonly span = computed<YearSpan | null>(() => yearSpan(this.ledger()));
  /** Inclusive season count. */
  protected readonly seasons = computed<number | null>(() => seasonCount(this.ledger()));
  /** Hero integration total as one dramatic hours+minutes figure, e.g. "642h 18m". */
  protected readonly heroTime = computed<string>(() =>
    formatDuration(this.ledger().summary.totalIntegrationSeconds),
  );
  /** Sub line for the "01 · Activity" section banner ("N nights · Xh Ym integrated"). */
  protected readonly activitySub = computed<string>(
    () =>
      `${formatCount(this.ledger().summary.nightCount)} nights · ` +
      `${formatDuration(this.ledger().summary.totalIntegrationSeconds)} integrated`,
  );
  /** Highlights of the journey. */
  protected readonly highlights = computed<Highlight[]>(() => highlights(this.ledger()));
  /** Heat-strip view-model. */
  protected readonly heat = computed<HeatStripView>(() => heatStrip(this.ledger()));
  /** Whether any imaged object resolves to sky coordinates (gates the universe globe). */
  protected readonly hasSky = computed(() => this.ledger().objects.some((o) => objectRaDec(o) != null));

  /** Thousands-separated integer for the template. */
  protected count(n: number): string {
    return formatCount(n);
  }
}
