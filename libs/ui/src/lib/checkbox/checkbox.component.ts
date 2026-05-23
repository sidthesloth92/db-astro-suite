import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Themed labelled checkbox wrapper.
 *
 * @deprecated Replaced by `SwitchComponent` from the Direction B Polished
 * component family. Slated for removal in a follow-up cleanup PR.
 */
@Component({
  selector: 'dba-ui-checkbox',
  standalone: true,
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxComponent {
  label = input<string>('');
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  
  checkedChange = output<boolean>();

  onToggle(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this.checkedChange.emit(inputEl.checked);
  }
}
