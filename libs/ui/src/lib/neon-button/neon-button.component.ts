import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-neon-button',
  standalone: true,
  imports: [],
  template: `
<button
  [type]="type"
  [disabled]="disabled"
  class="neon-button"
  [class.neon-button--primary]="variant === 'primary'"
  [class.neon-button--secondary]="variant === 'secondary'"
  [class.neon-button--sm]="size === 'sm'"
  [class.neon-button--full-width]="fullWidth"
>
  @if (label) {
    <span class="neon-button__text">{{ label }}</span>
  }
  <ng-content></ng-content>
</button>
  `,
  styleUrl: './neon-button.component.css'
})
export class NeonButtonComponent {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;
  @Input({ transform: booleanAttribute }) fullWidth = false;
}
