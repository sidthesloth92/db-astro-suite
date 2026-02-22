import { Component, ChangeDetectionStrategy, input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpaceButtonType = 'button' | 'submit' | 'reset';
export type SpaceButtonVariant = 'primary' | 'recording' | 'processing';
export type SpaceButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'dba-ui-space-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-button.component.html',
  styleUrls: ['./space-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpaceButtonComponent {
  label = input<string>('');
  type = input<SpaceButtonType>('button');
  variant = input<SpaceButtonVariant>('primary');
  size = input<SpaceButtonSize>('md');
  disabled = input(false, { transform: booleanAttribute });
  fullWidth = input(false, { transform: booleanAttribute });
}
