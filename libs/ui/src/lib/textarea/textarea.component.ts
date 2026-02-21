import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'db-textarea',
  standalone: true,
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextareaComponent {
  label = input<string>('');
  placeholder = input<string>('');
  value = input<string | undefined>('');
  rows = input<number>(3);
  
  valueChange = output<string>();

  onInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.valueChange.emit(textarea.value);
  }
}
