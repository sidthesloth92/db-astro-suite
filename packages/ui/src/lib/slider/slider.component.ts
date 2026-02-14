import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-slider',
  standalone: true,
  imports: [],
  template: `
<div class="slider-container">
  <label class="slider-label">
    <span class="slider-label__text">
      {{ label }}
      @if (tooltip) {
        <span class="slider-tooltip">
          <img
            src="assets/icons/question-mark-circle.svg"
            alt="Help"
            class="slider-tooltip__icon"
          />
          <span class="slider-tooltip__text">{{ tooltip }}</span>
        </span>
      }
    </span>
    <span class="slider-value">{{ displayValue }}</span>
  </label>
  <div class="slider-track">
    <input
      type="range"
      [min]="min"
      [max]="max"
      [step]="step"
      [value]="value"
      (input)="onInput($event)"
      class="slider-input"
    />
  </div>
</div>
  `,
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
