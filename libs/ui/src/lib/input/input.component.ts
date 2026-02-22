import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

export type InputType = 'text' | 'number' | 'date' | 'email' | 'password' | 'color';

@Component({
  selector: 'dba-ui-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent {
  label = input<string>('');
  placeholder = input<string>('');
  value = input<string | number>('');
  type = input<InputType>('text');
  
  valueChange = output<string | number>();

  onInput(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this.valueChange.emit(inputEl.value);
  }
}
