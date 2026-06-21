import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StoryObject } from '../../models/story.model';
import { formatCount, formatDuration } from '../../utils/format.util';
import { categoryIcon } from '../../utils/portfolio.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import { FilterDistributionComponent } from '../filter-distribution/filter-distribution.component';
import { ObjectImageComponent } from '../object-image/object-image.component';

/** A single imaged-object card: placeholder image, title, totals, mini filter bar. */
@Component({
  selector: 'dba-object-card',
  standalone: true,
  imports: [ObjectImageComponent, FilterDistributionComponent, CelIconComponent],
  templateUrl: './object-card.component.html',
  styleUrl: './object-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectCardComponent {
  /** The object to render. */
  readonly obj = input.required<StoryObject>();
  /** Emits the object id when the card is opened. */
  readonly open = output<string>();
  /** Emits the object id when its share button is pressed. */
  readonly share = output<string>();

  /** Category glyph. */
  protected readonly icon = computed<CelIconName>(() => categoryIcon(this.obj().category));

  /** Formatted duration. */
  protected dur(s: number): string {
    return formatDuration(s);
  }
  /** Formatted count. */
  protected count(n: number): string {
    return formatCount(n);
  }
}
