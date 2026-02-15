import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'db-checkbox',
  standalone: true,
  imports: [],
  template: `
    <label class="db-checkbox-container" [class.disabled]="disabled">
      <input
        type="checkbox"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onToggle($event)"
      />
      <span class="db-checkmark"></span>
      @if (label) {
        <span class="db-checkbox-label">{{ label }}</span>
      }
      <ng-content></ng-content>
    </label>
  `,
  styles: [`
    :host {
      display: block;
    }
    .db-checkbox-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
      font-family: var(--db-form-font-mono);
      font-size: inherit; /* Allow override from parent Utility class */
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: -0.02em;
      transition: color 0.2s;
    }
    .db-checkbox-container:hover .db-checkbox-label {
      color: var(--db-color-neon-pink);
    }
    .db-checkbox-container.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .db-checkmark {
      height: 16px;
      width: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 45, 149, 0.4);
      border-radius: 2px;
      position: relative;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .db-checkbox-container:hover .db-checkmark {
      border-color: var(--db-color-neon-pink);
      box-shadow: 0 0 8px rgba(255, 45, 149, 0.2);
    }
    input:checked ~ .db-checkmark {
      background: var(--db-color-neon-pink);
      border-color: var(--db-color-neon-pink);
      box-shadow: 0 0 10px var(--db-color-neon-pink);
    }
    .db-checkmark:after {
      content: "";
      position: absolute;
      display: none;
      left: 5px;
      top: 2px;
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    input:checked ~ .db-checkmark:after {
      display: block;
    }
  `]
})
export class CheckboxComponent {
  @Input() label = '';
  @Input() checked = false;
  @Input() disabled = false;
  
  @Output() checkedChange = new EventEmitter<boolean>();

  onToggle(event: Event) {
    const input = event.target as HTMLInputElement;
    this.checkedChange.emit(input.checked);
  }
}
