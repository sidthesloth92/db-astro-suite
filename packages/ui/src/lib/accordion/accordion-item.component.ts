import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-accordion-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="accordion-item" [class.expanded]="expanded">
      <button class="accordion-header" (click)="toggle()">
        <span class="accordion-title">{{ title }}</span>
        <span class="accordion-icon">{{ expanded ? '−' : '+' }}</span>
      </button>
      
      @if (expanded) {
        <div class="accordion-content">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`
    .accordion-item {
      background: rgba(10, 15, 25, 0.5);
      border: 1px solid rgba(255, 45, 149, 0.15);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .accordion-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(255, 255, 255, 0.02);
      border: none;
      cursor: pointer;
      color: var(--db-color-neon-pink, #ff2d95);
      font-family: var(--db-font-display, 'Orbitron', sans-serif);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.875rem;
      font-weight: 600;
      transition: background 0.2s;
    }

    .accordion-header:hover {
      background: rgba(255, 45, 149, 0.05);
    }

    .accordion-icon {
      font-size: 1.25rem;
      font-weight: bold;
    }

    .accordion-content {
      padding: 1.25rem;
      border-top: 1px solid rgba(255, 45, 149, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }
    
    .accordion-item.expanded {
      border-color: rgba(255, 45, 149, 0.4);
      box-shadow: 0 0 15px rgba(255, 45, 149, 0.1);
    }
  `]
})
export class AccordionItemComponent {
  @Input() title: string = '';
  @Input() expanded: boolean = false;

  toggle() {
    this.expanded = !this.expanded;
  }
}
