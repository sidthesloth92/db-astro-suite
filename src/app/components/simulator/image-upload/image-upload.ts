import { Component, output } from '@angular/core';

@Component({
  selector: 'sw-image-upload',
  imports: [],
  templateUrl: './image-upload.html',
  styleUrl: './image-upload.scss',
})
export class ImageUpload {
  imageSelected = output<Event>();

  handleImageUpload(event: Event): void {
    this.imageSelected.emit(event);
  }
}
