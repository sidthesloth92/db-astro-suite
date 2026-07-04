import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StoryTarget } from '../../models/story.model';
import { formatCount, formatDuration } from '../../utils/format.util';
import { categoryIcon } from '../../utils/portfolio.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import { FilterDistributionComponent } from '../filter-distribution/filter-distribution.component';
import { TargetImageComponent } from '../target-image/target-image.component';

/** A single imaged-target card: placeholder image, title, totals, mini filter bar. */
@Component({
  selector: 'dba-target-card',
  standalone: true,
  imports: [TargetImageComponent, FilterDistributionComponent, CelIconComponent],
  templateUrl: './target-card.component.html',
  styleUrl: './target-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetCardComponent {
  /** The target to render. */
  readonly target = input.required<StoryTarget>();
  /** Emits the target id when the card is opened. */
  readonly open = output<string>();
  /** Emits the target id when its share button is pressed. */
  readonly share = output<string>();

  /** Category glyph. */
  protected readonly icon = computed<CelIconName>(() => categoryIcon(this.target().category));

  /** Formatted duration. */
  protected dur(s: number): string {
    return formatDuration(s);
  }
  /** Formatted count. */
  protected count(n: number): string {
    return formatCount(n);
  }
}
