import { Component, ChangeDetectionStrategy, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

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
