import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { SegmentedTabOption } from './segmented-tabs.model';
import { TooltipDirective } from '../tooltip/tooltip.directive';

/** Size preset for `SegmentedTabsComponent`. */
export type SegmentedTabsSize = 'sm' | 'md';

/**
 * Pill group used in the top bar and mobile shell to switch between
 * top-level modes (e.g. "Infographic" / "Stellar Map").
 *
 * Each tab can optionally render a leading icon. Because this primitive
 * lives in `libs/ui` and must not couple to the icon set in this repo,
 * the icon is supplied as a `TemplateRef<SegmentedTabOption>` via the
 * `iconTemplate` input. The consumer's template instantiates the icon
 * component it wants for each option.
 */
@Component({
  selector: 'dba-ui-segmented-tabs',
  standalone: true,
  imports: [NgTemplateOutlet, TooltipDirective],
  templateUrl: './segmented-tabs.component.html',
  styleUrls: ['./segmented-tabs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedTabsComponent {
  /** Tab descriptors rendered in order. Must contain at least one option. */
  options = input.required<readonly SegmentedTabOption[]>();
  /** Currently selected option id. */
  value = input.required<string>();
  /** Visual size of the pill group. Defaults to `'md'`. */
  size = input<SegmentedTabsSize>('md');
  /** Disables interaction and dims the whole group. */
  disabled = input<boolean>(false);
  /**
   * Optional per-tab icon template. The template receives the
   * `SegmentedTabOption` as its `$implicit` context so callers can
   * branch on `opt.id` to pick the right icon.
   */
  iconTemplate = input<TemplateRef<{ $implicit: SegmentedTabOption }> | undefined>(undefined);

  /** Emits the new selected option id when the user picks a tab. */
  valueChange = output<string>();

  /** Internal click handler — emits the selected option id. */
  onSelect(id: string): void {
    if (this.disabled()) {
      return;
    }
    if (id !== this.value()) {
      this.valueChange.emit(id);
    }
  }
}

