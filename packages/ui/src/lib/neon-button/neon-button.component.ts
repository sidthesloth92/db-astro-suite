import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-neon-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './neon-button.component.html',
  styleUrl: './neon-button.component.css'
})
export class NeonButtonComponent {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;
}
