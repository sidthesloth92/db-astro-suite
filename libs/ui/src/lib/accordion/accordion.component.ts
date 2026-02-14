import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="accordion-container"><ng-content></ng-content></div>`,
  styles: [`
    .accordion-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  `]
})
export class AccordionComponent {}
