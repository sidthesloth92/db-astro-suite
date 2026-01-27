import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" [class.card--clickable]="clickable">
      <div class="card__header" *ngIf="title">
        <h3 class="card__title">{{ title }}</h3>
        <p class="card__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="card__content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--db-glass-bg, rgba(10, 15, 25, 0.7));
      backdrop-filter: var(--db-glass-blur, blur(12px));
      -webkit-backdrop-filter: var(--db-glass-blur, blur(12px));
      border: 1px solid var(--db-glass-border, rgba(255, 45, 149, 0.2));
      box-shadow: var(--db-shadow-glass, 0 8px 32px 0 rgba(0, 0, 0, 0.8));
      border-radius: var(--db-radius-lg, 0.75rem);
      padding: var(--db-spacing-lg, 1.5rem);
      transition: all var(--db-transition-normal, 250ms ease);
    }

    .card--clickable {
      cursor: pointer;
    }

    .card--clickable:hover {
      transform: translateY(-4px);
      border-color: var(--db-color-neon-pink, #ff2d95);
    }

    .card__header {
      margin-bottom: var(--db-spacing-md, 1rem);
    }

    .card__title {
      font-family: var(--db-font-display, 'Orbitron', sans-serif);
      font-size: 1.25rem;
      margin: 0;
      color: var(--db-color-text-primary, #e0e0e0);
    }

    .card__subtitle {
      font-family: var(--db-font-body, 'Rajdhani', sans-serif);
      font-size: 0.875rem;
      margin: 0.25rem 0 0 0;
      color: var(--db-color-text-muted, #94a3b8);
    }

    .card__content {
      color: var(--db-color-text-primary, #e0e0e0);
    }
  `]
})
export class CardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() clickable = false;
}
