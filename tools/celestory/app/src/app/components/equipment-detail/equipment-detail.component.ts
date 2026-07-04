import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CelestoryStory, StoryEquipment, StoryTarget } from '../../models/story.model';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import { profileUrl } from '../../models/app.constants';
import { formatCount, formatDuration } from '../../utils/format.util';
import { fmtRange } from '../../utils/portfolio.util';
import { TextButtonComponent } from '@db-astro-suite/ui';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { EquipmentShareModalComponent } from '../equipment-share-modal/equipment-share-modal.component';
import { MiniTargetCardComponent } from '../mini-target-card/mini-target-card.component';

/** Equipment detail: header, totals, and the targets captured with this gear. */
@Component({
  selector: 'dba-equipment-detail',
  standalone: true,
  imports: [TextButtonComponent, CelIconComponent, MiniTargetCardComponent, EquipmentShareModalComponent],
  templateUrl: './equipment-detail.component.html',
  styleUrl: './equipment-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailComponent {
  /** The equipment to show. */
  readonly equip = input.required<StoryEquipment>();
  /** The full story (to resolve captured targets). */
  readonly story = input.required<CelestoryStory>();
  /** The public handle (for the per-equipment share link). */
  readonly handle = input<string>('');
  /** Whether the profile is published (gates the per-equipment share link). */
  readonly published = input<boolean>(false);

  /** Return to the equipment list. */
  readonly back = output<void>();
  /** Open a target by id. */
  readonly openTarget = output<string>();

  /** Whether the per-equipment share modal is open. */
  protected readonly showShare = signal(false);

  /** Public deep-link to this gear, or '' when unpublished (gates the share row). */
  protected readonly shareUrl = computed(() =>
    this.published() && this.handle()
      ? `${profileUrl(this.handle())}?equipment=${encodeURIComponent(this.equip().id)}`
      : '',
  );

  /** Lower-cased noun for this gear ('camera' | 'telescope' | 'mount'). */
  protected readonly kindNoun = computed<CelIconName>(() => {
    const kind = this.equip().kind.toLowerCase();
    return kind === 'camera' || kind === 'mount' ? kind : 'telescope';
  });
  /** Header glyph (matches the gear kind). */
  protected readonly icon = computed<CelIconName>(() => this.kindNoun());
  /** Captured targets, busiest first. */
  protected readonly targets = computed<StoryTarget[]>(() => {
    const byId = new Map(this.story().targets.map((o) => [o.id, o] as const));
    return this.equip()
      .targetIds.map((id) => byId.get(id))
      .filter((o): o is StoryTarget => !!o)
      .sort((a, b) => b.totalIntegrationSeconds - a.totalIntegrationSeconds);
  });

  /** Spec line (focal length / f-ratio). */
  protected readonly detail = computed(() => {
    const e = this.equip();
    const parts: string[] = [];
    if (e.focalLengthMm) {
      parts.push(`${e.focalLengthMm}mm`);
    }
    if (e.fRatio) {
      parts.push(`f/${e.fRatio}`);
    }
    return parts.join(' · ');
  });

  protected dur(s: number): string {
    return formatDuration(s);
  }
  protected count(n: number): string {
    return formatCount(n);
  }
  protected range(a: string, b: string): string {
    return fmtRange(a, b);
  }
}
