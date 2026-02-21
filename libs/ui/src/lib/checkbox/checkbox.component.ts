import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'db-checkbox',
  standalone: true,
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxComponent {
  label = input<string>('');
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  
  checkedChange = output<boolean>();

  onToggle(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this.checkedChange.emit(inputEl.checked);
  }
}
