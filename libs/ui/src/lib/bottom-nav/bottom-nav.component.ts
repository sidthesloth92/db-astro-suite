import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { BottomNavItem } from './bottom-nav.model';

/**
 * Bottom navigation row used inside `FloatingSheetComponent`. Mirrors
 * the bottom-row of the `FloatingMobileControls` primitive from the
 * direction-b-polished design. The active item is marked with a small
 * pink dot above the icon. The icon component for each item is
 * supplied via the `iconTemplate` input — the template receives the
 * `BottomNavItem` as `$implicit`, so callers can switch on
 * `item.iconName`. Clicking any item — even the active one — emits
 * `activate`; the parent decides whether to toggle/collapse the sheet.
 */
@Component({
  selector: 'dba-ui-bottom-nav',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  /** Items rendered in the bottom row. */
  items = input.required<readonly BottomNavItem[]>();
  /** Id of the currently active item. */
  activeId = input.required<string>();
  /** Per-item icon template. Receives the `BottomNavItem` as `$implicit`. */
  iconTemplate = input<TemplateRef<{ $implicit: BottomNavItem }> | undefined>(undefined);

  /** Emits the item id every time the user taps an item. */
  activate = output<string>();

  /** Internal click handler — always emits the id (even when re-tapped). */
  onActivate(id: string): void {
    this.activate.emit(id);
  }
}

