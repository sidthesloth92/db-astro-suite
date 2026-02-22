import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dba-ag-filter-ring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-ring.html',
  styleUrl: './filter-ring.css'
})
export class FilterRingComponent {
  @Input() name: string = '';
  @Input() color: string = '#ffffff';
  @Input() duration: string = '0m';
  @Input() progress: number = 100; // Percentage of total integration time

  get strokeDashoffset(): number {
    // Circle circumference = 2 * PI * radius (21)
    const circumference = 131.95;
    // Calculate offset based on progress (100% = full circle)
    return circumference - (circumference * this.progress / 100);
  }
}
