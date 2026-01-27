import { Component, output } from '@angular/core';

@Component({
  selector: 'sw-image-upload-overlay',
  imports: [],
  templateUrl: './image-upload-overlay.html',
  styleUrl: './image-upload-overlay.scss',
})
export class ImageUploadOverlay {
  imageSelected = output<Event>();

  handleImageUpload(event: Event): void {
    this.imageSelected.emit(event);
  }
}
