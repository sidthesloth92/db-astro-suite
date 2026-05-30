import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Vertical accordion container.
 *
 * @deprecated Replaced by the Direction B Polished component family.
 * Slated for removal in a follow-up cleanup PR.
 */
@Component({
  selector: 'dba-ui-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionComponent {}
