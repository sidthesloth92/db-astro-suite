import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string | number | boolean;
}

@Component({
  selector: 'db-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectComponent {
  label = input<string>('');
  value = input<string | number | boolean>('');
  options = input<SelectOption[]>([]);
  noBox = input<boolean>(false);
  
  valueChange = output<string | number | boolean>();

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value);
  }
}
