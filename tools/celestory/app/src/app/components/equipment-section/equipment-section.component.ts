import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CelestoryStory, StoryEquipment } from '../../models/story.model';
import { formatCount, formatDuration } from '../../utils/format.util';
import { fmtRange } from '../../utils/portfolio.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/** The "Equipment" rig: cameras and optics grouped, each a clickable stats row. */
@Component({
  selector: 'dba-equipment-section',
  standalone: true,
  imports: [CelIconComponent],
  templateUrl: './equipment-section.component.html',
  styleUrl: './equipment-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentSectionComponent {
  /** The story to browse. */
  readonly story = input.required<CelestoryStory>();
  /** Emits an equipment id to open its detail. */
  readonly open = output<string>();

  /** Grouped gear — one list per kind; empty lists hide their section. */
  protected readonly cameras = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'camera'),
  );
  protected readonly optics = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'optic'),
  );
  protected readonly mounts = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'mount'),
  );

  /** A spec line for optics (focal length / f-ratio). */
  protected detail(e: StoryEquipment): string {
    const parts: string[] = [];
    if (e.focalLengthMm) {
      parts.push(`${e.focalLengthMm}mm`);
    }
    if (e.fRatio) {
      parts.push(`f/${e.fRatio}`);
    }
    return parts.join(' · ');
  }

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
