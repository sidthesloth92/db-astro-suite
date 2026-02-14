import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-space-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-button.component.html',
  styleUrl: './space-button.component.css'
})
export class SpaceButtonComponent {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'recording' | 'processing' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() fullWidth = false;
}
