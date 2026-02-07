import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.css'
})
export class SliderComponent {
  @Input() label = '';
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() precision = 0;
  @Input() tooltip = '';

  @Output() valueChange = new EventEmitter<number>();

  get displayValue(): string {
    return this.value.toFixed(this.precision);
  }

  onInput(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.valueChange.emit(value);
  }
}
