import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'db-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="db-form-group">
      <label *ngIf="label" class="db-form-label">{{ label }}</label>
      <input
        [type]="type"
        [placeholder]="placeholder"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
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
}
