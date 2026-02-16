import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ac-bortle-scale',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bortle-scale.html',
  styleUrl: './bortle-scale.css'
})
export class BortleScaleComponent {
  @Input() value: number = 5;
  @Input() accentColor: string = '#ff2d95';
  @Input() compact: boolean = false;

  readonly scale = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  getGradientPosition(): number {
    // Return percentage position for the indicator
    return ((this.value - 1) / 8) * 100;
  }
}
