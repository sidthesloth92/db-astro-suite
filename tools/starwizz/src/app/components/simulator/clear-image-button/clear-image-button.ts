import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IconComponent, closeIcon } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-sw-clear-image-button',
  imports: [IconComponent],
  templateUrl: './clear-image-button.html',
  styleUrl: './clear-image-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearImageButton {
  /** Emits when the user clicks the button. */
  clearClicked = output<void>();

  /** Close glyph rendered inside the button. */
  protected readonly closeIcon = closeIcon;

  handleClick(): void {
    this.clearClicked.emit();
  }
}
