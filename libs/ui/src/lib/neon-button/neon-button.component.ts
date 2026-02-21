import { Component, ChangeDetectionStrategy, input, booleanAttribute } from '@angular/core';

export type NeonButtonType = 'button' | 'submit' | 'reset';
export type NeonButtonVariant = 'primary' | 'secondary';
export type NeonButtonSize = 'sm' | 'md';

@Component({
  selector: 'db-neon-button',
  standalone: true,
  templateUrl: './neon-button.component.html',
  styleUrls: ['./neon-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NeonButtonComponent {
  label = input<string>('');
  type = input<NeonButtonType>('button');
  variant = input<NeonButtonVariant>('primary');
  size = input<NeonButtonSize>('md');
  disabled = input(false, { transform: booleanAttribute });
  fullWidth = input(false, { transform: booleanAttribute });
}
