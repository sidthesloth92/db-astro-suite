import { Component, ChangeDetectionStrategy, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Single accordion row, child of `<dba-ui-accordion>`.
 *
 * @deprecated Replaced by the Direction B Polished component family.
 * Slated for removal in a follow-up cleanup PR.
 */
@Component({
  selector: 'dba-ui-accordion-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion-item.component.html',
  styleUrls: ['./accordion-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionItemComponent {
  title = input<string>('');
  expanded = model<boolean>(false);

  toggle(event: MouseEvent) {
    event.preventDefault();
    this.expanded.update(v => !v);
  }
}
