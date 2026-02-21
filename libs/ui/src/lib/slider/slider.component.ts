import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'db-slider',
  standalone: true,
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent {
  label = input<string>('');
  value = input<number>(0);
  min = input<number>(0);
  max = input<number>(100);
  step = input<number>(1);
  precision = input<number>(0);
  tooltip = input<string>('');

  valueChange = output<number>();

  displayValue = computed(() => this.value().toFixed(this.precision()));

  onInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.valueChange.emit(val);
  }
}
