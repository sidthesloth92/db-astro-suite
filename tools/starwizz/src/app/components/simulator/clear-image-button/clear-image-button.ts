import { Component, output } from '@angular/core';

@Component({
  selector: 'sw-clear-image-button',
  imports: [],
  templateUrl: './clear-image-button.html',
  styleUrl: './clear-image-button.scss',
})
export class ClearImageButton {
  clearClicked = output<void>();

  handleClick(): void {
    this.clearClicked.emit();
  }
}
