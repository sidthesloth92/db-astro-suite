import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CelestoryStory, StoryTarget } from '../../models/story.model';
import { storyFilterColors } from '../../utils/portfolio.util';
import { TargetCardComponent } from '../target-card/target-card.component';

/** The "Targets" catalogue: category / equipment / year filters + a card grid. */
@Component({
  selector: 'dba-target-section',
  standalone: true,
  imports: [TargetCardComponent],
  templateUrl: './target-section.component.html',
  styleUrl: './target-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetSectionComponent {
  /** The story to browse. */
  readonly story = input.required<CelestoryStory>();
  /** Emits a target id to open its detail. */
  readonly open = output<string>();
  /** Emits a target id to open its share card. */
  readonly share = output<string>();

  /** Story-wide colours for unknown filter names (keeps card strips consistent). */
  protected readonly filterColors = computed(() => storyFilterColors(this.story()));

  /** Active filters. */
  protected readonly cat = signal('All');
  protected readonly gear = signal('All');
  protected readonly year = signal('All');

  /** Categories present (with counts). */
  protected readonly categories = computed(() =>
    this.story().summary.byCategory.filter((c) => c.targetCount > 0),
  );
  /** Gear groups for the equipment filter. */
  protected readonly cameras = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'camera'),
  );
  protected readonly telescopes = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'telescope'),
  );
  protected readonly mounts = computed(() =>
    this.story().equipment.filter((e) => e.kind.toLowerCase() === 'mount'),
  );
  /** Distinct imaging years. */
  protected readonly years = computed(() => {
    const set = new Set<number>();
    for (const o of this.story().targets) {
      for (const s of o.sessions) {
        const y = +s.date.slice(0, 4);
        if (y) {
          set.add(y);
        }
      }
    }
    return [...set].sort((a, b) => a - b);
  });

  /** Targets passing the active filters. */
  protected readonly filtered = computed<StoryTarget[]>(() => {
    const c = this.cat();
    const g = this.gear();
    const y = this.year();
    return this.story().targets.filter((o) => {
      if (c !== 'All' && o.category !== c) {
        return false;
      }
      if (g !== 'All' && !o.equipmentIds.includes(g)) {
        return false;
      }
      if (y !== 'All' && !o.sessions.some((s) => s.date.slice(0, 4) === y)) {
        return false;
      }
      return true;
    });
  });

  /** Select handlers. */
  onCat(event: Event): void {
    this.cat.set((event.target as HTMLSelectElement).value);
  }
  onGear(event: Event): void {
    this.gear.set((event.target as HTMLSelectElement).value);
  }
  onYear(event: Event): void {
    this.year.set((event.target as HTMLSelectElement).value);
  }
}
