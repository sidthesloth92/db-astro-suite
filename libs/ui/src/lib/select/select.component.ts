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
  imports: [],
  template: `
    <div class="db-form-group boxed-select-container">
      @if (label) {
        <label class="db-form-label">{{ label }}</label>
      }
      <div class="select-wrapper">
        <select
          [value]="value"
          (change)="onChange($event)"
          class="db-form-select-themed"
        >
          @for (opt of options; track opt.value) {
            <option [value]="opt.value">
              {{ opt.label }}
            </option>
          }
        </select>
        <div class="select-arrow">▼</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .boxed-select-container {
      border: 1px solid rgba(255, 45, 149, 0.1);
      padding: 0.5rem; /* 8px */
      margin-bottom: 0.5rem !important; /* Matches live site */
    }
    .select-wrapper {
      position: relative;
      width: 100%;
    }
    .db-form-select-themed {
      width: 100%;
      height: var(--db-form-control-height, 2rem);
      background: var(--db-color-space-black);
      border: 1px solid rgba(255, 45, 149, 0.3);
      color: var(--db-color-text-primary);
      padding: 0 0.5rem;
      font-size: 9px;
      font-family: var(--db-form-font-mono);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-radius: var(--db-radius-sm);
      appearance: none;
      -webkit-appearance: none;
      padding-right: 2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all var(--db-transition-fast, 150ms ease);
    }
    .db-form-select-themed:focus {
      outline: none;
      border-color: var(--db-color-neon-pink);
      box-shadow: 0 0 10px rgba(255, 45, 149, 0.2);
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

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value);
  }
}
