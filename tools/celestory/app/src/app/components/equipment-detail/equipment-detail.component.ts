import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CelestoryStory, StoryEquipment, StoryObject } from '../../models/story.model';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import { formatCount, formatDuration } from '../../utils/format.util';
import { fmtRange } from '../../utils/portfolio.util';
import { TextButtonComponent } from '@db-astro-suite/ui';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { EquipmentShareModalComponent } from '../equipment-share-modal/equipment-share-modal.component';
import { ObjectCardComponent } from '../object-card/object-card.component';

/** Equipment detail: header, totals, and the objects captured with this gear. */
@Component({
  selector: 'dba-equipment-detail',
  standalone: true,
  imports: [TextButtonComponent, CelIconComponent, ObjectCardComponent, EquipmentShareModalComponent],
  templateUrl: './equipment-detail.component.html',
  styleUrl: './equipment-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailComponent {
  /** The equipment to show. */
  readonly equip = input.required<StoryEquipment>();
  /** The full story (to resolve captured objects). */
  readonly story = input.required<CelestoryStory>();

  /** Return to the equipment list. */
  readonly back = output<void>();
  /** Open an object by id. */
  readonly openObject = output<string>();

  /** Whether the per-equipment share modal is open. */
  protected readonly showShare = signal(false);

  /** Whether this gear is a camera. */
  protected readonly isCamera = computed(() => this.equip().kind.toLowerCase() === 'camera');
  /** Header glyph. */
  protected readonly icon = computed<CelIconName>(() => (this.isCamera() ? 'camera' : 'optic'));
  /** Captured objects, busiest first. */
  protected readonly objects = computed<StoryObject[]>(() => {
    const byId = new Map(this.story().objects.map((o) => [o.id, o] as const));
    return this.equip()
      .objectIds.map((id) => byId.get(id))
      .filter((o): o is StoryObject => !!o)
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
