import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'db-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="db-form-group">
      <label *ngIf="label" class="db-form-label">{{ label }}</label>
      <textarea
        [placeholder]="placeholder"
        [ngModel]="value"
        [rows]="rows"
        (ngModelChange)="valueChange.emit($event)"
        class="db-form-input db-textarea"
      ></textarea>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .db-textarea {
      height: auto;
      min-height: 4rem;
      padding-top: var(--db-form-input-padding);
      padding-bottom: var(--db-form-input-padding);
      resize: vertical;
      line-height: 1.4;
    }
  `]
})
export class TextareaComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value: string | undefined = '';
  @Input() rows = 3;
  
  @Output() valueChange = new EventEmitter<string>();
}
