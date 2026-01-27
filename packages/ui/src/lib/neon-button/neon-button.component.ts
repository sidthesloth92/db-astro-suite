import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-neon-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      [type]="type"
      [disabled]="disabled"
      class="neon-button"
      [class.neon-button--secondary]="variant === 'secondary'"
    >
      <ng-content></ng-content>
      {{ label }}
    </button>
  `,
  styles: [`
    .neon-button {
      font-family: var(--db-font-display, 'Orbitron', sans-serif);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 0.75rem 1.5rem;
      border: 1px solid var(--db-color-neon-pink, #ff2d95);
      background: transparent;
      color: var(--db-color-neon-pink, #ff2d95);
      cursor: pointer;
      transition: all var(--db-transition-normal, 250ms ease);
      box-shadow: 0 0 10px rgba(255, 45, 149, 0.2), inset 0 0 5px rgba(255, 45, 149, 0.1);
      border-radius: var(--db-radius-sm, 0.25rem);
    }

    .neon-button:hover:not(:disabled) {
      background: var(--db-color-neon-pink, #ff2d95);
      color: var(--db-color-space-black, #050508);
      box-shadow: 0 0 20px rgba(255, 45, 149, 0.5), 0 0 40px rgba(255, 45, 149, 0.3);
    }

    .neon-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .neon-button--secondary {
      border-color: var(--db-color-neon-blue, #0066ff);
      color: var(--db-color-neon-blue, #0066ff);
      box-shadow: 0 0 10px rgba(0, 102, 255, 0.2), inset 0 0 5px rgba(0, 102, 255, 0.1);
    }

    .neon-button--secondary:hover:not(:disabled) {
      background: var(--db-color-neon-blue, #0066ff);
      color: var(--db-color-space-black, #050508);
      box-shadow: 0 0 20px rgba(0, 102, 255, 0.5), 0 0 40px rgba(0, 102, 255, 0.3);
    }
  `]
})
export class NeonButtonComponent {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
}
