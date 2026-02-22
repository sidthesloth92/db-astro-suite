import { Component, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dba-sw-clear-image-button',
  imports: [],
  templateUrl: './clear-image-button.html',
  styleUrl: './clear-image-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClearImageButton {
  clearClicked = output<void>();

  handleClick(): void {
    this.clearClicked.emit();
  }
}
