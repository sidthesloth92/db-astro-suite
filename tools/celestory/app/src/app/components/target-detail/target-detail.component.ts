import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CelestoryStory, StoryEquipment, StoryTarget } from '../../models/story.model';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import type { FilterRow, SessionView } from '../../models/portfolio-view.types';
import type { AltAz } from '../../models/sky.types';
import { profileUrl } from '../../models/app.constants';
import { formatCount, formatDuration } from '../../utils/format.util';
import { moonGlyphFor } from '../../utils/moon-phase.util';
import {
  categoryIcon,
  equipNameMap,
  filterRows,
  fmtDate,
  sessionViews,
  storyFilterColors,
} from '../../utils/portfolio.util';
import { TextButtonComponent } from '@db-astro-suite/ui';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { MoonGlyphComponent } from '../moon-glyph/moon-glyph.component';
import { TargetImageComponent } from '../target-image/target-image.component';
import { TargetShareModalComponent } from '../target-share-modal/target-share-modal.component';

/** Target detail: hero image, totals, aliases, per-filter rows, gear, session timeline. */
@Component({
  selector: 'dba-target-detail',
  standalone: true,
  imports: [
    TextButtonComponent,
    CelIconComponent,
    MoonGlyphComponent,
    TargetImageComponent,
    TargetShareModalComponent,
  ],
  templateUrl: './target-detail.component.html',
  styleUrl: './target-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.in-modal]': 'embedded()' },
})
export class TargetDetailComponent {
  /** The target to show. */
  readonly target = input.required<StoryTarget>();
  /** The full story (for equipment resolution). */
  readonly story = input.required<CelestoryStory>();
  /** The public handle (for the per-target share link). */
  readonly handle = input<string>('');
  /** Whether the profile is published (gates the per-target share link). */
  readonly published = input<boolean>(false);
  /** Rendered inside the planetarium popup (hides the back link, compacts the head). */
  readonly embedded = input<boolean>(false);
  /** Current horizontal position, when shown from the planetarium. */
  readonly altaz = input<AltAz | null>(null);

  /** Return to the targets list. */
  readonly back = output<void>();
  /** Open a piece of equipment by id. */
  readonly openEquipment = output<string>();

  /** Whether the per-target share modal is open. */
  protected readonly showShare = signal(false);

  /** Public deep-link to this target, or '' when unpublished (gates the share row). */
  protected readonly shareUrl = computed(() =>
    this.published() && this.handle()
      ? `${profileUrl(this.handle())}?target=${encodeURIComponent(this.target().id)}`
      : '',
  );

  /** Category glyph. */
  protected readonly icon = computed<CelIconName>(() => categoryIcon(this.target().category));
  /** Story-wide colours for unknown filter names (keeps views consistent). */
  private readonly filterColors = computed(() => storyFilterColors(this.story()));

  /** Per-filter integration rows. */
  protected readonly rows = computed<FilterRow[]>(() =>
    filterRows(this.target().filters, this.filterColors()),
  );
  /** Equipment used (resolved). */
  protected readonly gear = computed<StoryEquipment[]>(() => {
    const byId = new Map(this.story().equipment.map((e) => [e.id, e] as const));
    return this.target().equipmentIds.map((id) => byId.get(id)).filter((e): e is StoryEquipment => !!e);
  });
  /** Session timeline view-models. */
  protected readonly sessions = computed<SessionView[]>(() =>
    sessionViews(this.target().sessions, equipNameMap(this.story()), this.filterColors()),
  );

  protected dur(s: number): string {
    return formatDuration(s);
  }
  protected round(n: number): number {
    return Math.round(n);
  }
  protected count(n: number): string {
    return formatCount(n);
  }
  protected date(d: string): string {
    return fmtDate(d);
  }
  /** Lunar-phase name for a session date (e.g. "Waxing Gibbous"). */
  protected moonName(d: string): string {
    return moonGlyphFor(d).name;
  }
  /** camera/telescope/mount glyph for a gear chip. */
  protected gearIcon(e: StoryEquipment): CelIconName {
    const kind = e.kind.toLowerCase();
    if (kind === 'camera') {
      return 'camera';
    }
    if (kind === 'mount') {
      return 'mount';
    }
    return 'telescope';
  }
}
