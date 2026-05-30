import { Component, ChangeDetectionStrategy, input, booleanAttribute } from '@angular/core';

export type NeonButtonType = 'button' | 'submit' | 'reset';
export type NeonButtonVariant = 'primary' | 'secondary';
export type NeonButtonSize = 'sm' | 'md';

/**
 * Legacy neon-themed button.
 *
 * @deprecated Replaced by `TextButtonComponent` from the Direction B Polished
 * component family. Slated for removal in a follow-up cleanup PR.
 */
@Component({
  selector: 'dba-ui-neon-button',
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
