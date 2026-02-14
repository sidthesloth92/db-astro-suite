import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'db-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="db-form-group">
      <label *ngIf="label" class="db-form-label">{{ label }}</label>
      <div class="select-wrapper">
        <select
          [ngModel]="value"
          (ngModelChange)="valueChange.emit($event)"
          class="db-form-select"
        >
          <option *ngFor="let opt of options" [value]="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <div class="select-arrow">▼</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .select-wrapper {
      position: relative;
      width: 100%;
    }
    .db-form-select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 2rem;
      cursor: pointer;
    }
    .select-arrow {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.6rem;
      color: var(--db-color-neon-pink);
      pointer-events: none;
      opacity: 0.6;
    }
    option {
      background: var(--db-color-space-black);
      color: white;
    }
  `]
})
export class SelectComponent {
  @Input() label = '';
  @Input() value: any = '';
  @Input() options: SelectOption[] = [];
  
  @Output() valueChange = new EventEmitter<any>();
}
