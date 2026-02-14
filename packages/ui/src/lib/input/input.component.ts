import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'db-input',
  standalone: true,
  imports: [],
  template: `
    <div class="db-form-group">
      @if (label) {
        <label class="db-form-label">{{ label }}</label>
      }
      <input
        [type]="type"
        [placeholder]="placeholder"
        [value]="value"
        (input)="onInput($event)"
        class="db-form-input"
      />
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class InputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value: any = '';
  @Input() type: 'text' | 'number' | 'date' | 'email' | 'password' | 'color' = 'text';
  
  @Output() valueChange = new EventEmitter<any>();

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(input.value);
  }
}
